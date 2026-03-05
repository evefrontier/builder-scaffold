import "dotenv/config";
import { Transaction } from "@mysten/sui/transactions";
import {
    handleError,
    requireEnv,
    getEnvConfig,
    hydrateWorldConfig,
    initializeContext,
} from "../utils/helper";
import { deriveObjectId } from "../utils/derive-object-id";
import { GAME_CHARACTER_B_ID } from "../utils/constants";
import { resolveTribeTokenIds } from "./ids";
import { MODULE } from "./modules";

/**
 * Transfer tribe token to Player B (PLAYER_B_ADDRESS / GAME_CHARACTER_B_ID).
 * The recipient must own a Character in the allowed tribe.
 *
 * Transfers the first owned Token<TRIBE_TOKEN> to Player B (auto-queried, no TOKEN_OBJECT_ID needed).
 * Env: PLAYER_B_ADDRESS (recipient)
 */
async function main() {
    console.log("============= Transfer Tribe Token ==============\n");

    try {
        const env = getEnvConfig();
        const privateKey = requireEnv("ADMIN_PRIVATE_KEY");
        const ctx = initializeContext(env.network, privateKey);
        await hydrateWorldConfig(ctx);
        const { client, keypair, config, address } = ctx;

        const ids = resolveTribeTokenIds(env.network);

        const tribeTokenType = `0x2::token::Token<${ids.packageId}::${MODULE.TRIBE_TOKEN}::TRIBE_TOKEN>`;
        const ownedTokens = await client.getOwnedObjects({
            owner: address,
            filter: { StructType: tribeTokenType },
            limit: 1,
        });
        const tokenId = ownedTokens.data[0]?.data?.objectId;
        if (!tokenId) {
            throw new Error(`No ${tribeTokenType} found. Run mint-tribe-token first.`);
        }

        const recipient = requireEnv("PLAYER_B_ADDRESS");
        const characterId = deriveObjectId(
            config.objectRegistry,
            BigInt(GAME_CHARACTER_B_ID),
            config.packageId
        );

        if (!ids.tokenPolicyId) {
            throw new Error("TRIBE_TOKEN_POLICY_ID required. Publish tribe_token first.");
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
            arguments: [tx.object(ids.tokenPolicyId), request, tx.object(characterId)],
        });

        // 3. token::confirm_request - complete transfer
        tx.moveCall({
            target: `0x2::token::confirm_request`,
            typeArguments: [`${ids.packageId}::${MODULE.TRIBE_TOKEN}::TRIBE_TOKEN`],
            arguments: [tx.object(ids.tokenPolicyId), request],
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
