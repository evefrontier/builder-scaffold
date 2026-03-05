import "dotenv/config";
import { Transaction } from "@mysten/sui/transactions";
import { createClient, keypairFromPrivateKey, Network } from "../utils/config";
import { handleError, requireEnv } from "../utils/helper";
import { resolveCurrencyTokenIds } from "./ids";
import { MODULE } from "./modules";

async function main() {
    console.log("============= Mint CURRENCY_TOKEN ==============\n");

    try {
        const network = (process.env.SUI_NETWORK as Network) || "localnet";
        const privateKey = requireEnv("ADMIN_PRIVATE_KEY");
        const client = createClient(network);
        const keypair = keypairFromPrivateKey(privateKey);
        const address = keypair.getPublicKey().toSuiAddress();

        const ids = resolveCurrencyTokenIds(network);

        if (!ids.treasuryCapId) {
            throw new Error("CURRENCY_TREASURY_CAP_ID required. Publish currency_token first.");
        }

        const amount = BigInt(process.env.MINT_AMOUNT ?? "1000000");
        const recipient = process.env.MINT_RECIPIENT || process.env.PLAYER_B_ADDRESS || address;

        const tx = new Transaction();
        tx.moveCall({
            target: `${ids.packageId}::${MODULE.CURRENCY_TOKEN}::mint`,
            arguments: [
                tx.object(ids.treasuryCapId),
                tx.pure.u64(amount),
                tx.pure.address(recipient),
            ],
        });

        const result = await client.signAndExecuteTransaction({
            transaction: tx,
            signer: keypair,
            options: { showEffects: true },
        });

        console.log("Minted", amount.toString(), "CURRENCY_TOKEN to", recipient);
        console.log("Transaction digest:", result.digest);
    } catch (error) {
        handleError(error);
    }
}

main();
