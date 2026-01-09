import { SuiClient } from "@mysten/sui/client";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { coinWithBalance, Transaction } from "@mysten/sui/transactions";
import { requestSuiFromFaucetV2 } from "@mysten/sui/faucet";
import { getFaucetHost } from "@mysten/sui/faucet";
import {
  genAddressSeed,
  generateNonce,
  generateRandomness,
  getExtendedEphemeralPublicKey,
  getZkLoginSignature,
  jwtToAddress,
} from "@mysten/sui/zklogin";
import axios from "axios";
import { jwtDecode, type JwtPayload } from "jwt-decode";
import { createInterface } from "readline";

//** Send a transaction with the zkLogin address.
//  - Check balance
//  - Generate ephemeral credentials
//  - Display login URL
//  - Wait for JWT input (returned from the user)
//  - Execute transaction (either with the provided transaction bytes or a test transaction)
//** */

// Configuration
const AUTH_URL = "https://test.auth.evefrontier.com";
const CLIENT_ID = "c8815001-f950-4147-905e-4833d904cd38";
const PROVER_URL = "https://prover-dev.mystenlabs.com/v1";
const SUI_NETWORK_URL = "https://fullnode.devnet.sui.io:443";

const suiClient = new SuiClient({ url: SUI_NETWORK_URL });

// Fixed salt (will be dynamic once salt server is deployed)
const USER_SALT = "45065794681351736022272385507316449656";

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
const calculateProofExpirationEpoch = async (
  epochDuration: number = 5
): Promise<number> => {
  const suiSysState = await suiClient.getLatestSuiSystemState();
  return Number(suiSysState.epoch) + epochDuration;
};

// Generate ephemeral keypair, randomness, and nonce for zkLogin
const generateUserDataForZkLogin = async () => {
  const ephemeralKeyPair = new Ed25519Keypair();
  const randomness = generateRandomness();
  const maxEpoch = await calculateProofExpirationEpoch();

  const nonce = generateNonce(
    ephemeralKeyPair.getPublicKey(),
    maxEpoch,
    randomness
  );

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

// Get ZK proof from prover
const getProof = async (
  jwt: string,
  ephemeralKeyPair: Ed25519Keypair,
  maxEpoch: number,
  randomness: string
) => {
  const extendedEphemeralPublicKey = getExtendedEphemeralPublicKey(
    ephemeralKeyPair.getPublicKey()
  );

  const zkProofResult = await axios.post(
    PROVER_URL,
    {
      jwt,
      extendedEphemeralPublicKey,
      maxEpoch,
      jwtRandomness: randomness,
      salt: USER_SALT,
      keyClaimName: "sub",
    },
    {
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  return zkProofResult.data;
};

const fetchBalance = async (zkLoginUserAddress: string) => {
  console.log("\n📍 Your zkLogin address:", zkLoginUserAddress);

  const suiBalance = await suiClient.getBalance({
    owner: zkLoginUserAddress,
    coinType: "0x2::sui::SUI",
  });

  console.log("(Make sure this address has SUI for gas fees)\n");
  console.log("SUI balance:", suiBalance.totalBalance);

  if (Number(suiBalance.totalBalance) === 0) {
    console.log("No current balance");
    console.log("Requesting balance");
    const txDigest = await requestSuiFromFaucetV2({
      host: getFaucetHost("testnet"),
      recipient: zkLoginUserAddress,
    });

    console.log("Requested balance from faucet. Digest:", txDigest);
  }

  return suiBalance.totalBalance;
};

// Create test transaction bytes
const createTestTransactionBytes = async (zkLoginUserAddress: string) => {
  const testTx = new Transaction();
  const coin = coinWithBalance({ balance: 100_000_000 });
  testTx.transferObjects(
    [coin],
    "0x0000000000000000000000000000000000000000000000000000000000000000"
  );
  testTx.setSender(zkLoginUserAddress);
  const testTxnBytes = await testTx.build({ client: suiClient });
  return testTxnBytes.toString();
};

// Execute the test transaction
const executeTxn = async (
  transactionBytesString: string,
  jwt: string,
  ephemeralKeyPair: Ed25519Keypair,
  maxEpoch: number,
  randomness: string
) => {
  const decodedJwt = jwtDecode(jwt) as JwtPayload;

  const txBytes = Uint8Array.from(
    transactionBytesString.split(",").map(Number)
  );

  // Sign either the provided transaction bytes or the test transaction bytes if none is provided
  const signedBytes = await ephemeralKeyPair.signTransaction(txBytes);

  if (!decodedJwt.sub || !decodedJwt.aud || Array.isArray(decodedJwt?.aud)) {
    throw new Error("Missing or invalid decoded JWT fields");
  }

  // Generate addressSeed
  const addressSeed: string = genAddressSeed(
    BigInt(USER_SALT),
    "sub",
    decodedJwt.sub,
    decodedJwt.aud
  ).toString();

  console.log("🔐 Requesting ZK proof from prover...");
  const proof = await getProof(jwt, ephemeralKeyPair, maxEpoch, randomness);

  const zkLoginSignature = getZkLoginSignature({
    inputs: {
      ...proof,
      addressSeed,
    },
    maxEpoch,
    userSignature: signedBytes.signature,
  });

  console.log("📤 Executing transaction...\n");

  const res = await suiClient.executeTransactionBlock({
    transactionBlock: signedBytes.bytes,
    signature: zkLoginSignature,
    options: { showEffects: true },
  });

  console.log("✅ Transaction completed!");
  console.log("   Digest:", res.digest);
  console.log("   Status:", res.effects?.status.status);
};

// Main interactive flow
const main = async () => {
  console.log("\n🚀 zkLogin Transaction Script\n");
  console.log("═".repeat(50));

  // Step 1: Generate credentials
  console.log("\n📝 Step 1: Generating ephemeral credentials...");
  const { ephemeralKeyPair, maxEpoch, randomness, nonce } =
    await generateUserDataForZkLogin();

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

  // Step 4: Execute transaction
  console.log("\n═".repeat(30));
  console.log("\n⚙️  Step 3: Checking balance...\n");

  try {
    await fetchBalance(jwtToAddress(jwt, USER_SALT));
  } catch (error) {
    console.error("\n❌ Error:", error);
    process.exit(1);
  }

  console.log("\n⚙️  Step 4: Executing transaction...\n");

  try {
    const getTxBytesString = await createTestTransactionBytes(
      jwtToAddress(jwt, USER_SALT)
    );

    console.log("\n⚙️  Test transaction bytes:\n", getTxBytesString);

    console.log("\n═".repeat(10));

    // Step 5: Wait for transaction bytes input
    const txbytesString = await promptUser(
      "📋 Paste your transaction bytes from the test tx printed above: "
    );

    await executeTxn(
      txbytesString,
      jwt,
      ephemeralKeyPair,
      maxEpoch,
      randomness
    );
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error("\n❌ Error:", error.response?.data || error.message);
    } else if (error instanceof Error) {
      console.error("\n❌ Error:", error.message);
    } else {
      console.error("\n❌ Unknown error occurred");
    }
    process.exit(1);
  }

  console.log("\n═".repeat(30));
  console.log("🎉 Done!\n");
};

main();
