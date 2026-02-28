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
import { requireStorageUnitExtensionPackageId, resolveMarketplaceId } from "./extension-ids";
import { getCharacterOwnerCap } from "../helpers/character";
import { MODULE } from "./modules";

/**
 * Seller lists an item with a price. Item moves from ephemeral to main (escrow).
 *
 * Env: STORAGE_UNIT_EXTENSION_PACKAGE_ID, MARKETPLACE_ID, STORAGE_UNIT_ID
 *      SELLER_CHARACTER_ID, SELLER_OWNER_CAP_ID (Character OwnerCap for seller)
 *      LISTED_TYPE_ID, LISTED_QUANTITY, PAYMENT_TYPE_ID, PAYMENT_QUANTITY
 *      PLAYER_A_PRIVATE_KEY (seller)
 */
async function main() {
    console.log("============= List Item (Marketplace) ==============\n");

    try {
        const env = getEnvConfig();
        const playerKey = requireEnv("PLAYER_A_PRIVATE_KEY");
        const ctx = initializeContext(env.network, playerKey);
        await hydrateWorldConfig(ctx);

        const packageId = requireStorageUnitExtensionPackageId();
        const marketplaceId = resolveMarketplaceId();
        const storageUnitId = requireEnv("STORAGE_UNIT_ID");
        const sellerCharacterId = requireEnv("SELLER_CHARACTER_ID");

        let sellerOwnerCapId = process.env.SELLER_OWNER_CAP_ID;
        if (!sellerOwnerCapId) {
            sellerOwnerCapId = await getCharacterOwnerCap(
                sellerCharacterId,
                ctx.client,
                ctx.config,
                ctx.address
            ) ?? undefined;
        }
        if (!sellerOwnerCapId) {
            throw new Error("SELLER_OWNER_CAP_ID required, or Character must have OwnerCap");
        }

        const listedTypeId = BigInt(process.env.LISTED_TYPE_ID ?? "88070");
        const listedQuantity = Number(process.env.LISTED_QUANTITY ?? "5");
        const paymentTypeId = BigInt(process.env.PAYMENT_TYPE_ID ?? "88069");
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
