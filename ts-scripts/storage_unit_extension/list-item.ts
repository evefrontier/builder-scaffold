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
import { GAME_CHARACTER_C_ID, ITEM_A_TYPE_ID, STORAGE_A_ITEM_ID } from "../utils/constants";
import { requireStorageUnitExtensionPackageId, resolveMarketplaceId } from "./extension-ids";
import { getCharacterOwnerCap } from "../helpers/character";
import { MODULE } from "./modules";

/**
 * Player C (seller) lists an item with a price. Item moves from ephemeral to main (escrow).
 * Player C's character-owned inventory must be seeded first (run seed-owned-inventory).
 *
 * Env: STORAGE_UNIT_EXTENSION_PACKAGE_ID, MARKETPLACE_ID (or runtime-object-ids.json)
 *      LISTED_TYPE_ID (default: 446), LISTED_QUANTITY (default: 5)
 *      PAYMENT_TYPE_ID (default: 446), PAYMENT_QUANTITY (default: 5)
 *      PLAYER_C_PRIVATE_KEY (seller)
 */
async function main() {
    console.log("============= List Item (Marketplace) ==============\n");

    try {
        const env = getEnvConfig();
        const playerKey = requireEnv("PLAYER_C_PRIVATE_KEY");
        const ctx = initializeContext(env.network, playerKey);
        await hydrateWorldConfig(ctx);

        const packageId = requireStorageUnitExtensionPackageId();
        const marketplaceId = resolveMarketplaceId();
        const storageUnitId = deriveObjectId(ctx.config.objectRegistry, STORAGE_A_ITEM_ID, ctx.config.packageId);
        const sellerCharacterId = deriveObjectId(ctx.config.objectRegistry, BigInt(GAME_CHARACTER_C_ID), ctx.config.packageId);

        const sellerOwnerCapId = await getCharacterOwnerCap(
            sellerCharacterId,
            ctx.client,
            ctx.config,
            ctx.address
        ) ?? undefined;
        if (!sellerOwnerCapId) {
            throw new Error("OwnerCap not found for seller character. Make sure PLAYER_A_PRIVATE_KEY owns the character.");
        }

        const listedTypeId = BigInt(process.env.LISTED_TYPE_ID ?? String(ITEM_A_TYPE_ID));
        const listedQuantity = Number(process.env.LISTED_QUANTITY ?? "5");
        const paymentTypeId = BigInt(process.env.PAYMENT_TYPE_ID ?? String(ITEM_A_TYPE_ID));
        const paymentQuantity = Number(process.env.PAYMENT_QUANTITY ?? "5");

        const tx = new Transaction();

        const [ownerCap, returnReceipt] = tx.moveCall({
            target: `${ctx.config.packageId}::${MODULES.CHARACTER}::borrow_owner_cap`,
            typeArguments: [`${ctx.config.packageId}::${MODULES.CHARACTER}::Character`],
            arguments: [tx.object(sellerCharacterId), tx.object(sellerOwnerCapId)],
        });

        tx.moveCall({
            target: `${packageId}::${MODULE.MARKETPLACE}::list_item`,
            typeArguments: [`${ctx.config.packageId}::${MODULES.CHARACTER}::Character`],
            arguments: [
                tx.object(marketplaceId),
                tx.object(storageUnitId),
                tx.object(sellerCharacterId),
                ownerCap,
                tx.pure.u64(listedTypeId),
                tx.pure.u32(listedQuantity),
                tx.pure.u64(paymentTypeId),
                tx.pure.u32(paymentQuantity),
            ],
        });

        tx.moveCall({
            target: `${ctx.config.packageId}::${MODULES.CHARACTER}::return_owner_cap`,
            typeArguments: [`${ctx.config.packageId}::${MODULES.CHARACTER}::Character`],
            arguments: [tx.object(sellerCharacterId), ownerCap, returnReceipt],
        });

        const result = await ctx.client.signAndExecuteTransaction({
            transaction: tx,
            signer: ctx.keypair,
            options: { showEffects: true },
        });

        console.log("Item listed!");
        console.log("Transaction digest:", result.digest);
    } catch (error) {
        handleError(error);
    }
}

main();
