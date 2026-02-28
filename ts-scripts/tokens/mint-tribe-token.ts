import "dotenv/config";
import { Transaction } from "@mysten/sui/transactions";
import { createClient, keypairFromPrivateKey, Network } from "../utils/config";
import { handleError, requireEnv } from "../utils/helper";
import { resolveTokenIds } from "./ids";
import { MODULE } from "./modules";

async function main() {
    console.log("============= Mint Tribe Token ==============\n");

    try {
        const network = (process.env.SUI_NETWORK as Network) || "localnet";
        const privateKey = requireEnv("ADMIN_PRIVATE_KEY");
        const client = createClient(network);
        const keypair = keypairFromPrivateKey(privateKey);

        const ids = await resolveTokenIds(client, "", network);

        if (!ids.tribeTreasuryCapId) {
            throw new Error("TRIBE_TREASURY_CAP_ID required. Publish tokens first.");
        }

        const amount = BigInt(process.env.MINT_AMOUNT ?? "1000000");

        const tx = new Transaction();
        tx.moveCall({
            target: `${ids.packageId}::${MODULE.TRIBE_TOKEN}::mint`,
            typeArguments: [`${ids.packageId}::${MODULE.TRIBE_TOKEN}::TRIBE_TOKEN`],
            arguments: [tx.object(ids.tribeTreasuryCapId), tx.pure.u64(amount)],
        });

        const result = await client.signAndExecuteTransaction({
            transaction: tx,
            signer: keypair,
            options: { showEffects: true },
        });

        console.log("Minted", amount.toString(), "tribe tokens to sender");
        console.log("Transaction digest:", result.digest);
    } catch (error) {
        handleError(error);
    }
}

main();
