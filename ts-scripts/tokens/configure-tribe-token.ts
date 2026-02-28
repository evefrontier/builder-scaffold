import "dotenv/config";
import { Transaction } from "@mysten/sui/transactions";
import { createClient, keypairFromPrivateKey, Network } from "../utils/config";
import { handleError, requireEnv } from "../utils/helper";
import { resolveTokenIds } from "./ids";
import { MODULE } from "./modules";

async function main() {
    console.log("============= Configure Tribe Token ==============\n");

    try {
        const network = (process.env.SUI_NETWORK as Network) || "localnet";
        const privateKey = requireEnv("ADMIN_PRIVATE_KEY");
        const client = createClient(network);
        const keypair = keypairFromPrivateKey(privateKey);
        const address = keypair.getPublicKey().toSuiAddress();

        const ids = await resolveTokenIds(client, address, network);

        if (!ids.tribeTokenPolicyCapId || !ids.tribeTokenPolicyId) {
            throw new Error(
                "TRIBE_TOKEN_POLICY_CAP_ID and TRIBE_TOKEN_POLICY_ID required. Publish tokens first."
            );
        }

        const allowedTribe = Number(process.env.TRIBE_ALLOWED ?? 100);

        const tx = new Transaction();
        tx.moveCall({
            target: `${ids.packageId}::${MODULE.TRIBE_TOKEN}::configure_tribe_rule`,
            typeArguments: [`${ids.packageId}::${MODULE.TRIBE_TOKEN}::TRIBE_TOKEN`],
            arguments: [
                tx.object(ids.tribeTokenPolicyId),
                tx.object(ids.tribeTokenPolicyCapId),
                tx.pure.u32(allowedTribe),
            ],
        });

        const result = await client.signAndExecuteTransaction({
            transaction: tx,
            signer: keypair,
            options: { showEffects: true },
        });

        console.log("Tribe token configured! Allowed tribe:", allowedTribe);
        console.log("Transaction digest:", result.digest);
    } catch (error) {
        handleError(error);
    }
}

main();
