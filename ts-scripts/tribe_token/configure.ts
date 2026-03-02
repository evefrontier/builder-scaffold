import "dotenv/config";
import { Transaction } from "@mysten/sui/transactions";
import { createClient, keypairFromPrivateKey, Network } from "../utils/config";
import { handleError, requireEnv } from "../utils/helper";
import { resolveTribeTokenIds } from "./ids";
import { MODULE } from "./modules";

async function main() {
    console.log("============= Configure Tribe Token ==============\n");

    try {
        const network = (process.env.SUI_NETWORK as Network) || "localnet";
        const privateKey = requireEnv("ADMIN_PRIVATE_KEY");
        const client = createClient(network);
        const keypair = keypairFromPrivateKey(privateKey);

        const ids = resolveTribeTokenIds(network);

        if (!ids.tokenPolicyCapId || !ids.tokenPolicyId) {
            throw new Error(
                "TRIBE_TOKEN_POLICY_CAP_ID and TRIBE_TOKEN_POLICY_ID required. Publish tribe_token first."
            );
        }

        const allowedTribe = Number(process.env.TRIBE_ALLOWED ?? 100);

        const tx = new Transaction();
        tx.moveCall({
            target: `${ids.packageId}::${MODULE.TRIBE_TOKEN}::configure_tribe_rule`,
            arguments: [
                tx.object(ids.tokenPolicyId),
                tx.object(ids.tokenPolicyCapId),
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
