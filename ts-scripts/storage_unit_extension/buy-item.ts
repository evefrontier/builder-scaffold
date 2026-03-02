import "dotenv/config";
import { Transaction } from "@mysten/sui/transactions";
import { MODULES } from "../utils/config";
import {
    getEnvConfig,
    handleError,
    hydrateWorldConfig,
    initializeContext,
    requireEnv,
} from "../utils/helper";
import { deriveObjectId } from "../utils/derive-object-id";
import { GAME_CHARACTER_B_ID, GAME_CHARACTER_C_ID, STORAGE_A_ITEM_ID } from "../utils/constants";
import { requireStorageUnitExtensionPackageId, resolveMarketplaceId } from "./extension-ids";
import { getCharacterOwnerCap } from "../helpers/character";
import { MODULE } from "./modules";

/**
 * Player B (buyer) purchases the item listed by Player C. Seller can be offline.
 *
 * Env: STORAGE_UNIT_EXTENSION_PACKAGE_ID, MARKETPLACE_ID (or runtime-object-ids.json)
 *      PLAYER_B_PRIVATE_KEY (buyer)
 */
async function main() {
    console.log("============= Buy Item (Marketplace) ==============\n");

    try {
        const env = getEnvConfig();
        const playerKey = requireEnv("PLAYER_B_PRIVATE_KEY");
        const ctx = initializeContext(env.network, playerKey);
        await hydrateWorldConfig(ctx);

        const packageId = requireStorageUnitExtensionPackageId();
        const marketplaceId = resolveMarketplaceId();
        const storageUnitId = deriveObjectId(ctx.config.objectRegistry, STORAGE_A_ITEM_ID, ctx.config.packageId);
        const buyerCharacterId = deriveObjectId(ctx.config.objectRegistry, BigInt(GAME_CHARACTER_B_ID), ctx.config.packageId);
        const sellerCharacterId = deriveObjectId(ctx.config.objectRegistry, BigInt(GAME_CHARACTER_C_ID), ctx.config.packageId);

        const buyerOwnerCapId = await getCharacterOwnerCap(
            buyerCharacterId,
            ctx.client,
            ctx.config,
            ctx.address
        ) ?? undefined;
        if (!buyerOwnerCapId) {
            throw new Error("OwnerCap not found for buyer character. Make sure PLAYER_B_PRIVATE_KEY owns the character.");
        }

        const tx = new Transaction();

        const [ownerCap, returnReceipt] = tx.moveCall({
            target: `${ctx.config.packageId}::${MODULES.CHARACTER}::borrow_owner_cap`,
            typeArguments: [`${ctx.config.packageId}::${MODULES.CHARACTER}::Character`],
            arguments: [tx.object(buyerCharacterId), tx.object(buyerOwnerCapId)],
        });

        tx.moveCall({
            target: `${packageId}::${MODULE.MARKETPLACE}::buy_item`,
            typeArguments: [`${ctx.config.packageId}::${MODULES.CHARACTER}::Character`],
            arguments: [
                tx.object(marketplaceId),
                tx.object(storageUnitId),
                tx.object(buyerCharacterId),
                tx.object(sellerCharacterId),
                ownerCap,
            ],
        });

        tx.moveCall({
            target: `${ctx.config.packageId}::${MODULES.CHARACTER}::return_owner_cap`,
            typeArguments: [`${ctx.config.packageId}::${MODULES.CHARACTER}::Character`],
            arguments: [tx.object(buyerCharacterId), ownerCap, returnReceipt],
        });

        const result = await ctx.client.signAndExecuteTransaction({
            transaction: tx,
            signer: ctx.keypair,
            options: { showEffects: true },
        });

        console.log("Item purchased!");
        console.log("Transaction digest:", result.digest);
    } catch (error) {
        handleError(error);
    }
}

main();
