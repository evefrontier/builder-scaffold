import * as fs from "node:fs";
import * as path from "node:path";
import { SuiGrpcClient } from "@mysten/sui/grpc";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { coinWithBalance, Transaction } from "@mysten/sui/transactions";
import { fromBase64, normalizeSuiAddress } from "@mysten/sui/utils";
import {
    generateNonce,
    generateRandomness,
    getExtendedEphemeralPublicKey,
    getZkLoginSignature,
    type ZkLoginSignatureInputs,
} from "@mysten/sui/zklogin";
import { createInterface } from "readline";

/** Send transactions as your EVE Frontier zkLogin address, on Sui testnet.
 - Log in once with your EVE Frontier account
 - Fetch your address and ZK proof from the EVE Frontier API, as EVE Vault
   does (cached for the session)
 - Loop: load unsigned transaction bytes from a file or a paste, sign, execute
 - Write each result to last-tx.json for the builder scripts to read
*/

// Configuration — from zklogin/.env (see .env.example)
const SCRIPT_DIR = import.meta.dirname;
loadEnv(path.join(SCRIPT_DIR, ".env"));

const AUTH_URL = requireConfig("AUTH_URL");
const CLIENT_ID = requireConfig("CLIENT_ID");
const NETWORK = "testnet";
const SUI_NETWORK_URL = process.env.SUI_NETWORK_URL || "https://fullnode.testnet.sui.io:443";

/** The builder scripts read results from here (see ts-scripts/utils/last-tx.ts). */
const LAST_TX_PATH = path.join(SCRIPT_DIR, "last-tx.json");

const suiClient = new SuiGrpcClient({
    network: NETWORK,
    baseUrl: SUI_NETWORK_URL,
});

function loadEnv(file: string) {
    if (fs.existsSync(file)) process.loadEnvFile(file);
}

function requireConfig(name: string): string {
    const value = process.env[name];
    if (!value) {
        console.error(
            `\n❌ ${name} is not set. Copy zklogin/.env.example to zklogin/.env and fill it in.`
        );
        process.exit(1);
    }
    return value;
}

// Helper to prompt user for input
const promptUser = (question: string): Promise<string> => {
    const rl = createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            rl.close();
            resolve(answer.trim());
        });
    });
};

// Calculate proof expiration epoch
const calculateProofExpirationEpoch = async (epochDuration: number = 5): Promise<number> => {
    const { response: epochInfo } = await suiClient.ledgerService.getEpoch({});
    const rawEpoch = epochInfo.epoch?.epoch;
    if (rawEpoch === undefined || rawEpoch === null) {
        throw new Error("Failed to retrieve current epoch from Sui ledger service.");
    }
    const currentEpoch = Number(rawEpoch);
    if (!Number.isFinite(currentEpoch)) {
        throw new Error(
            `Unparseable epoch value received from Sui ledger service: ${String(rawEpoch)}`
        );
    }
    return currentEpoch + epochDuration;
};

// Generate ephemeral keypair, randomness, and nonce for zkLogin
const generateUserDataForZkLogin = async () => {
    const ephemeralKeyPair = new Ed25519Keypair();
    const randomness = generateRandomness();
    const maxEpoch = await calculateProofExpirationEpoch();

    const nonce = generateNonce(ephemeralKeyPair.getPublicKey(), maxEpoch, randomness);

    return {
        ephemeralKeyPair,
        maxEpoch,
        randomness,
        nonce,
    };
};

// Create login URL
const createLoginUrl = (nonce: string): string => {
    const redirectURL = encodeURIComponent("https://www.sui.io");
    return `${AUTH_URL}/oauth2/authorize?client_id=${CLIENT_ID}&response_type=id_token&scope=openid&redirect_uri=${redirectURL}&nonce=${nonce}`;
};

// ── EVE Frontier API ──────────────────────────────────────────────────────────
// The same endpoints EVE Vault uses (evevault packages/shared/src/auth and
// wallet/zkProof.ts). The API holds the Enoki app, so your salt — and so your
// address — is the one EVE Vault gives you, and no Enoki key is needed here.

type ApiContext = { apiBaseUrl: string; tenant: string };

/**
 * Error message with its `cause` chain. Node's `fetch` reports every network failure as
 * "fetch failed" and puts the reason — e.g. `getaddrinfo ENOTFOUND <host>` — in `cause`.
 */
const describeError = (error: unknown): string => {
    const parts: string[] = [];
    for (let e: unknown = error; e != null && parts.length < 5; ) {
        if (e instanceof Error) {
            parts.push(e.message);
            e = e.cause;
        } else {
            parts.push(String(e));
            break;
        }
    }
    return parts.join(" — ");
};

/** Unverified JWT payload — used only to route requests, never to trust them. */
const decodeJwtClaims = (jwt: string): Record<string, unknown> => {
    const payload = jwt.split(".")[1];
    if (!payload)
        throw new Error("That doesn't look like a JWT (expected header.payload.signature).");
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
};

/**
 * API gateway and tenant for this login. Mirrors wallet-core's
 * `resolveEveTier` (src/jwt/api-context.ts): stillness and liminality default
 * to the live tier, utopia and umbra are always uat, others default to test;
 * an explicit `tier` claim overrides the defaults.
 */
const getApiContext = (jwt: string): ApiContext => {
    const claims = decodeJwtClaims(jwt);
    const tenant = typeof claims.tenant === "string" ? claims.tenant : "";
    const tierClaim = typeof claims.tier === "string" ? claims.tier : "";
    if (!tenant) throw new Error("The login token has no tenant claim.");
    const tier =
        tenant === "utopia" || tenant === "umbra"
            ? "uat"
            : tierClaim || (tenant === "stillness" || tenant === "liminality" ? "live" : "test");
    const apiBaseUrl =
        process.env.EVE_API_URL?.replace(/\/$/, "") || `https://api.${tier}.pub.evefrontier.com`;
    return { apiBaseUrl, tenant };
};

const callApi = async <T>(
    jwt: string,
    route: string,
    init: { method: "GET" | "POST"; body?: unknown }
): Promise<T> => {
    const { apiBaseUrl, tenant } = getApiContext(jwt);
    const response = await fetch(`${apiBaseUrl}${route}`, {
        method: init.method,
        headers: {
            "X-Tenant": tenant,
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${jwt}`,
        },
        ...(init.body === undefined ? {} : { body: JSON.stringify(init.body) }),
    });
    const text = await response.text();
    if (!response.ok) {
        throw new Error(`${init.method} ${route} failed (${response.status}): ${text}`);
    }
    try {
        return JSON.parse(text) as T;
    } catch {
        throw new Error(`${route} returned invalid JSON: ${text}`);
    }
};

/** Your zkLogin address, derived from the salt the API holds for this account. */
const fetchZkLoginAddress = async (jwt: string): Promise<string> => {
    const data = await callApi<{ address?: string }>(jwt, "/auth/zklogin", { method: "GET" });
    if (!data.address)
        throw new Error(`/auth/zklogin returned no address: ${JSON.stringify(data)}`);
    return data.address;
};

/**
 * Exchanges the login token for one the prover accepts, carrying this
 * session's nonce. EVE Vault does the same before every proof.
 */
const vendJwt = async (jwt: string, nonce: string): Promise<string> => {
    const data = await callApi<{ token?: string }>(jwt, "/auth/zklogin/vend-jwt", {
        method: "POST",
        body: { nonce },
    });
    if (!data.token) throw new Error("/auth/zklogin/vend-jwt returned no token.");
    return data.token;
};

const fetchZkProof = async (
    vendedJwt: string,
    ephemeralKeyPair: Ed25519Keypair,
    randomness: string,
    maxEpoch: number
): Promise<ZkLoginSignatureInputs> => {
    const proof = await callApi<ZkLoginSignatureInputs>(vendedJwt, "/auth/zklogin/zkp", {
        method: "POST",
        body: {
            extendedEphemeralPublicKey: getExtendedEphemeralPublicKey(
                ephemeralKeyPair.getPublicKey()
            ),
            maxEpoch,
            network: NETWORK,
            randomness,
        },
    });
    if (
        !proof.proofPoints ||
        !proof.issBase64Details ||
        !proof.headerBase64 ||
        !proof.addressSeed
    ) {
        throw new Error(`/auth/zklogin/zkp returned an incomplete proof: ${JSON.stringify(proof)}`);
    }
    return proof;
};

/**
 * The repo-root .env must target the world this login belongs to; otherwise
 * the scripts build transactions against a world where you own nothing.
 */
const checkTenant = (jwt: string) => {
    loadEnv(path.join(SCRIPT_DIR, "..", ".env"));
    const expected = process.env.TENANT;
    const { tenant } = getApiContext(jwt);
    console.log("   Tenant:", tenant);
    if (expected && expected !== tenant) {
        console.error(`\n❌ You logged in to ${tenant}, but TENANT in your .env is ${expected}.`);
        console.error("   Log in to the matching server, or change TENANT in the repo-root .env.");
        process.exit(1);
    }
};

/**
 * The kit's expected address, from the repo-root .env. If the API derives a
 * different one, this isn't the account the character belongs to, and every
 * transaction would come from an address that owns nothing.
 */
const checkExpectedAddress = (zkLoginUserAddress: string) => {
    loadEnv(path.join(SCRIPT_DIR, "..", ".env"));
    const expected = process.env.ZKLOGIN_ADDRESS;
    if (!expected) return;
    if (normalizeSuiAddress(expected) !== normalizeSuiAddress(zkLoginUserAddress)) {
        console.error("\n❌ This login's address doesn't match ZKLOGIN_ADDRESS in your .env:");
        console.error("   logged in as:", zkLoginUserAddress);
        console.error("   kit expects: ", expected);
        console.error(
            "   Log in with the EVE Frontier account from your kit, or ask a facilitator."
        );
        process.exit(1);
    }
    console.log("   ✓ Matches ZKLOGIN_ADDRESS in your kit");
};

const fetchBalance = async (zkLoginUserAddress: string) => {
    console.log("\n📍 Your zkLogin address:", zkLoginUserAddress);

    const suiBalance = await suiClient.core.getBalance({
        owner: zkLoginUserAddress,
        coinType: "0x2::sui::SUI",
    });

    console.log("SUI balance:", suiBalance.balance.balance);

    if (Number(suiBalance.balance.balance) === 0) {
        console.log("⚠️  No SUI for gas. Ask a facilitator to fund your kit address.");
    }

    return suiBalance.balance.balance;
};

// Create test transaction bytes: send 1 MIST to yourself (no funds are lost)
const createTestTransactionBytes = async (zkLoginUserAddress: string) => {
    const testTx = new Transaction();
    const coin = coinWithBalance({ balance: 1 });
    testTx.transferObjects([coin], zkLoginUserAddress);
    testTx.setSender(zkLoginUserAddress);
    return testTx.build({ client: suiClient });
};

/** Accept base64 (what the builder scripts write) or comma-separated decimals. */
const parseTxBytes = (input: string): Uint8Array => {
    const text = input.trim();
    if (!text.includes(",")) {
        try {
            return fromBase64(text);
        } catch {
            throw new Error(
                "Invalid transaction bytes: expected base64 or comma-separated numbers."
            );
        }
    }
    const byteValues = text.split(",").map((value, index) => {
        const trimmed = value.trim();
        const num = Number(trimmed);
        if (trimmed === "" || !Number.isInteger(num) || num < 0 || num > 255) {
            throw new Error(
                `Invalid transaction bytes: value "${trimmed}" at position ${index} ` +
                    "is not an integer between 0 and 255."
            );
        }
        return num;
    });
    return Uint8Array.from(byteValues);
};

/** Read bytes from a file path — tolerates quotes and escaped spaces from drag-and-drop. */
const readTxFile = (input: string): Uint8Array => {
    const cleaned = input
        .trim()
        .replace(/^['"]|['"]$/g, "")
        .replace(/\\ /g, " ");
    const filePath = path.resolve(cleaned);
    if (!fs.existsSync(filePath)) {
        throw new Error(`No file at ${filePath}`);
    }
    return parseTxBytes(fs.readFileSync(filePath, "utf8"));
};

/** Shape documented in ts-scripts/utils/last-tx.ts — keep the two in sync. */
const writeLastTx = (result: Record<string, unknown>) => {
    fs.writeFileSync(
        LAST_TX_PATH,
        JSON.stringify({ ...result, executedAt: new Date().toISOString() }, null, 2)
    );
};

// Execute a transaction and report success or failure clearly
const executeTxn = async (
    txBytes: Uint8Array,
    ephemeralKeyPair: Ed25519Keypair,
    maxEpoch: number,
    proof: ZkLoginSignatureInputs
) => {
    const signedBytes = await ephemeralKeyPair.signTransaction(txBytes);

    const zkLoginSignature = getZkLoginSignature({
        inputs: proof,
        maxEpoch,
        userSignature: signedBytes.signature,
    });

    console.log("📤 Executing transaction...\n");

    const res = await suiClient.core.executeTransaction({
        transaction: txBytes,
        signatures: [zkLoginSignature],
        include: { effects: true, objectTypes: true },
    });

    const tx = res.$kind === "Transaction" ? res.Transaction : res.FailedTransaction;
    const created = (tx.effects?.changedObjects ?? [])
        .filter((o) => o.idOperation === "Created")
        .map((o) => ({ objectId: o.objectId, type: tx.objectTypes?.[o.objectId] ?? null }));

    if (res.$kind === "Transaction" && tx.status.success) {
        console.log("✅ Transaction succeeded!");
        console.log("   Digest:", tx.digest);
        writeLastTx({ digest: tx.digest, success: true, created });
        return;
    }

    const error = tx.status.success ? null : tx.status.error;
    const abort = error?.$kind === "MoveAbort" ? error.MoveAbort : undefined;
    console.error("❌ Transaction FAILED — nothing was changed on chain.");
    console.error("   Digest:", tx.digest);
    console.error("   Error:", error?.message ?? "unknown");
    if (abort) {
        const name = abort.cleverError?.constantName ?? `code ${abort.abortCode}`;
        console.error(
            `   Move abort ${name} in ${abort.location?.module}::${abort.location?.functionName}`
        );
        if (abort.cleverError?.value) console.error(`   "${abort.cleverError.value}"`);
    }
    writeLastTx({
        digest: tx.digest,
        success: false,
        error: error?.message ?? "unknown",
        abort: abort && {
            code: abort.abortCode,
            name: abort.cleverError?.constantName,
            message: abort.cleverError?.value,
            module: abort.location?.module,
            functionName: abort.location?.functionName,
        },
        created: [],
    });
};

// Main interactive flow
const main = async () => {
    console.log("\n🚀 zkLogin Transaction Script (Sui testnet)\n");
    console.log("═".repeat(50));

    // Step 1: Generate credentials
    console.log("\n📝 Step 1: Generating ephemeral credentials...");
    const { ephemeralKeyPair, maxEpoch, randomness, nonce } = await generateUserDataForZkLogin();

    console.log("   ✓ Ephemeral keypair created");
    console.log("   ✓ Max epoch:", maxEpoch);
    console.log("   ✓ Randomness generated");

    // Step 2: Display login URL
    console.log("\n🔗 Step 2: Login URL generated\n");
    const loginUrl = createLoginUrl(nonce);
    console.log("   Open this URL in your browser to log in:\n");
    console.log(`   ${loginUrl}\n`);

    console.log("═".repeat(50));
    console.log("\n   After logging in, you'll be redirected to sui.io");
    console.log("   Copy the 'id_token' value from the URL fragment.\n");

    // Step 3: Wait for JWT input
    const jwt = await promptUser("📋 Paste your JWT token here: ");

    if (!jwt) {
        console.error("\n❌ No JWT provided. Exiting.");
        process.exit(1);
    }

    // Step 4: Resolve address and proof
    console.log("\n═".repeat(30));
    console.log("\n⚙️  Step 3: Resolving your zkLogin address...\n");

    let zkLoginUserAddress: string;
    let proof: ZkLoginSignatureInputs;
    try {
        checkTenant(jwt);
        zkLoginUserAddress = await fetchZkLoginAddress(jwt);
        await fetchBalance(zkLoginUserAddress);
        checkExpectedAddress(zkLoginUserAddress);

        // Fetch ZK proof once and cache it for all transactions
        console.log("\n🔐 Fetching ZK proof (one-time)...");
        proof = await fetchZkProof(
            await vendJwt(jwt, nonce),
            ephemeralKeyPair,
            randomness,
            maxEpoch
        );
        console.log("   ✓ ZK proof cached\n");
    } catch (error) {
        console.error("\n❌ Error:", describeError(error));
        process.exit(1);
    }

    console.log("\n⚙️  Step 4: Ready to execute transactions\n");

    // Transaction loop - keeps running until user exits
    while (true) {
        try {
            const choice = (
                await promptUser(
                    "📋 Load transaction from [f]ile, [p]aste bytes, run a [t]est, or e[x]it: "
                )
            ).toLowerCase();

            let txBytes: Uint8Array;
            if (choice === "x" || choice === "exit" || choice === "quit") {
                console.log("\n👋 Goodbye!\n");
                break;
            } else if (choice === "f" || choice === "file") {
                txBytes = readTxFile(await promptUser("   File path: "));
            } else if (choice === "p" || choice === "paste") {
                txBytes = parseTxBytes(await promptUser("   Paste bytes: "));
            } else if (choice === "t" || choice === "test") {
                txBytes = await createTestTransactionBytes(zkLoginUserAddress);
            } else {
                console.log("   Please type f, p, t or x.\n");
                continue;
            }

            // Rebuild with this session's address as sender before signing
            const txb = Transaction.from(txBytes);
            txb.setSender(zkLoginUserAddress);
            const builtBytes = await txb.build({ client: suiClient });

            await executeTxn(builtBytes, ephemeralKeyPair, maxEpoch, proof);

            console.log("\n═".repeat(10));
        } catch (error) {
            console.error("\n❌ Error:", describeError(error));
            // Don't exit - just continue to next iteration
            console.log("\n🔄 You can try again or type 'x' to exit\n");
        }
    }
};

main();
