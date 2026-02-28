import "dotenv/config";
import { Transaction } from "@mysten/sui/transactions";
import { createClient, keypairFromPrivateKey, Network } from "../utils/config";
import { handleError, requireEnv } from "../utils/helper";
import { resolveTokenIds } from "./ids";
import { MODULE } from "./modules";

/**
 * Transfer tribe token to a recipient.
 * The recipient must provide their Character (owned by them, in the allowed tribe).
 *
 * Env: TOKEN_OBJECT_ID (the tribe token to transfer)
 *      RECIPIENT_ADDRESS
 *      RECIPIENT_CHARACTER_ID (the recipient's Character object)
 */
async function main() {
    console.log("============= Transfer Tribe Token ==============\n");

    try {
        const network = (process.env.SUI_NETWORK as Network) || "localnet";
        const privateKey = requireEnv("ADMIN_PRIVATE_KEY");
        const client = createClient(network);
        const keypair = keypairFromPrivateKey(privateKey);

        const ids = await resolveTokenIds(client, "", network);

        const tokenId = requireEnv("TOKEN_OBJECT_ID");
        const recipient = requireEnv("RECIPIENT_ADDRESS");
        const characterId = requireEnv("RECIPIENT_CHARACTER_ID");

        if (!ids.tribeTokenPolicyId) {
            throw new Error("TRIBE_TOKEN_POLICY_ID required. Publish tokens first.");
        }

        const tx = new Transaction();

        // 1. token::transfer - creates ActionRequest
        const [request] = tx.moveCall({
            target: `0x2::token::transfer`,
            typeArguments: [`${ids.packageId}::${MODULE.TRIBE_TOKEN}::TRIBE_TOKEN`],
            arguments: [tx.object(tokenId), tx.pure.address(recipient)],
        });

        // 2. tribe_rule::verify - stamp with Character
        tx.moveCall({
            target: `${ids.packageId}::${MODULE.TRIBE_RULE}::verify`,
            typeArguments: [`${ids.packageId}::${MODULE.TRIBE_TOKEN}::TRIBE_TOKEN`],
            arguments: [tx.object(ids.tribeTokenPolicyId), request, tx.object(characterId)],
        });

        // 3. token::confirm_request - complete transfer
        tx.moveCall({
            target: `0x2::token::confirm_request`,
            typeArguments: [`${ids.packageId}::${MODULE.TRIBE_TOKEN}::TRIBE_TOKEN`],
            arguments: [tx.object(ids.tribeTokenPolicyId), request],
        });

        const result = await client.signAndExecuteTransaction({
            transaction: tx,
            signer: keypair,
            options: { showEffects: true },
        });

        console.log("Transferred tribe token to", recipient);
        console.log("Transaction digest:", result.digest);
    } catch (error) {
        handleError(error);
    }
}

main();
