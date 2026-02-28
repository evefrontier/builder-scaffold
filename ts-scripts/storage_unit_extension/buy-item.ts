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
 * Buyer purchases the listed item. Seller can be offline.
 *
 * Env: STORAGE_UNIT_EXTENSION_PACKAGE_ID, MARKETPLACE_ID, STORAGE_UNIT_ID
 *      BUYER_CHARACTER_ID, SELLER_CHARACTER_ID
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
        const storageUnitId = requireEnv("STORAGE_UNIT_ID");
        const buyerCharacterId = requireEnv("BUYER_CHARACTER_ID");
        const sellerCharacterId = requireEnv("SELLER_CHARACTER_ID");

        let buyerOwnerCapId = process.env.BUYER_OWNER_CAP_ID;
        if (!buyerOwnerCapId) {
            buyerOwnerCapId = await getCharacterOwnerCap(
                buyerCharacterId,
                ctx.client,
                ctx.config,
                ctx.address
            ) ?? undefined;
        }
        if (!buyerOwnerCapId) {
            throw new Error("BUYER_OWNER_CAP_ID required, or Character must have OwnerCap");
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
