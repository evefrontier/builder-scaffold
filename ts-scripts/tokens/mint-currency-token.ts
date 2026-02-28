import "dotenv/config";
import { Transaction } from "@mysten/sui/transactions";
import { createClient, keypairFromPrivateKey, Network } from "../utils/config";
import { handleError, requireEnv } from "../utils/helper";
import { resolveTokenIds } from "./ids";
import { MODULE } from "./modules";

async function main() {
    console.log("============= Mint CURRENCY_TOKEN (Open-Loop Currency) ==============\n");

    try {
        const network = (process.env.SUI_NETWORK as Network) || "localnet";
        const privateKey = requireEnv("ADMIN_PRIVATE_KEY");
        const client = createClient(network);
        const keypair = keypairFromPrivateKey(privateKey);
        const address = keypair.getPublicKey().toSuiAddress();

        const ids = await resolveTokenIds(client, address, network);

        if (!ids.currencyTreasuryCapId) {
            throw new Error("CURRENCY_TREASURY_CAP_ID required. Publish tokens first.");
        }

        const amount = BigInt(process.env.MINT_AMOUNT ?? "1000000");
        const recipient = process.env.MINT_RECIPIENT ?? address;

        const tx = new Transaction();
        tx.moveCall({
            target: `${ids.packageId}::${MODULE.CURRENCY_TOKEN}::mint`,
            typeArguments: [`${ids.packageId}::${MODULE.CURRENCY_TOKEN}::CURRENCY_TOKEN`],
            arguments: [
                tx.object(ids.currencyTreasuryCapId),
                tx.pure.u64(amount),
                tx.pure.address(recipient),
            ],
        });

        const result = await client.signAndExecuteTransaction({
            transaction: tx,
            signer: keypair,
            options: { showEffects: true },
        });

        console.log("Minted", amount.toString(), "to", recipient);
        console.log("Transaction digest:", result.digest);
    } catch (error) {
        handleError(error);
    }
}

main();
