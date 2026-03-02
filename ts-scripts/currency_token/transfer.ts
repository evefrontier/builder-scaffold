import "dotenv/config";
import { Transaction } from "@mysten/sui/transactions";
import { createClient, keypairFromPrivateKey, Network } from "../utils/config";
import { handleError, requireEnv } from "../utils/helper";
import { resolveCurrencyTokenIds } from "./ids";
import { MODULE } from "./modules";

/**
 * Ensure a recipient has at least TRANSFER_AMOUNT CURRENCY_TOKEN.
 *
 * Checks the recipient's current balance; if below TRANSFER_AMOUNT, mints
 * the shortfall directly using the treasury cap. This always leaves the
 * recipient with enough tokens to complete the supply unit test flow.
 *
 * Env:
 *   ADMIN_PRIVATE_KEY     — treasury cap holder (minter)
 *   TRANSFER_RECIPIENT    — recipient address (optional, defaults to PLAYER_B_ADDRESS)
 *   PLAYER_B_ADDRESS      — fallback recipient
 *   TRANSFER_AMOUNT       — minimum balance to ensure (default: 10000)
 */
async function main() {
    console.log("============= Transfer CURRENCY_TOKEN ==============\n");

    try {
        const network = (process.env.SUI_NETWORK as Network) || "localnet";
        const privateKey = requireEnv("ADMIN_PRIVATE_KEY");
        const client = createClient(network);
        const keypair = keypairFromPrivateKey(privateKey);

        const ids = resolveCurrencyTokenIds(network);
        if (!ids.treasuryCapId) {
            throw new Error("CURRENCY_TREASURY_CAP_ID required. Publish currency_token first.");
        }

        const coinType = `${ids.packageId}::${MODULE.CURRENCY_TOKEN}::CURRENCY_TOKEN`;
        const recipient =
            process.env.TRANSFER_RECIPIENT ||
            process.env.PLAYER_B_ADDRESS ||
            requireEnv("TRANSFER_RECIPIENT");
        const targetAmount = BigInt(process.env.TRANSFER_AMOUNT ?? "10000");

        // Check recipient's existing balance
        const existingCoins = await client.getCoins({ owner: recipient, coinType });
        const existingBalance = existingCoins.data.reduce(
            (sum, c) => sum + BigInt(c.balance),
            0n
        );

        if (existingBalance >= targetAmount) {
            console.log(`Recipient already has ${existingBalance} tokens (>= ${targetAmount}). Nothing to do.`);
            return;
        }

        const mintAmount = targetAmount - existingBalance;
        console.log(`Recipient has ${existingBalance} tokens. Minting ${mintAmount} more to reach ${targetAmount}.`);

        const tx = new Transaction();
        tx.moveCall({
            target: `${ids.packageId}::${MODULE.CURRENCY_TOKEN}::mint`,
            arguments: [
                tx.object(ids.treasuryCapId),
                tx.pure.u64(mintAmount),
                tx.pure.address(recipient),
            ],
        });

        const result = await client.signAndExecuteTransaction({
            transaction: tx,
            signer: keypair,
            options: { showEffects: true },
        });

        console.log(`Minted ${mintAmount} CURRENCY_TOKEN to`, recipient);
        console.log("Transaction digest:", result.digest);
    } catch (error) {
        handleError(error);
    }
}

main();
