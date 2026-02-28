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
import { requireStorageUnitExtensionPackageId, resolveSupplyUnitId } from "./extension-ids";
import { MODULE } from "./modules";

/**
 * User orders items by paying with CURRENCY_TOKEN.
 * Extension splits exact payment, transfers to collection address, deposits items to buyer ephemeral.
 *
 * Env: STORAGE_UNIT_EXTENSION_PACKAGE_ID, SUPPLY_UNIT_ID, STORAGE_UNIT_ID
 *      BUYER_CHARACTER_ID, COIN_OBJECT_ID (Coin<CURRENCY_TOKEN> to spend)
 *      ORDER_QUANTITY (default: 1)
 *      PLAYER_B_PRIVATE_KEY (buyer)
 */
async function main() {
    console.log("============= Order Items (Supply Unit) ==============\n");

    try {
        const env = getEnvConfig();
        const playerKey = requireEnv("PLAYER_B_PRIVATE_KEY");
        const ctx = initializeContext(env.network, playerKey);
        await hydrateWorldConfig(ctx);

        const packageId = requireStorageUnitExtensionPackageId();
        const supplyUnitId = resolveSupplyUnitId();
        const storageUnitId = requireEnv("STORAGE_UNIT_ID");
        const buyerCharacterId = requireEnv("BUYER_CHARACTER_ID");
        const coinObjectId = requireEnv("COIN_OBJECT_ID");
        const quantity = Number(process.env.ORDER_QUANTITY ?? "1");

        const tx = new Transaction();

        tx.moveCall({
            target: `${packageId}::${MODULE.SUPPLY_UNIT}::order_items`,
            arguments: [
                tx.object(supplyUnitId),
                tx.object(storageUnitId),
                tx.object(buyerCharacterId),
                tx.object(coinObjectId),
                tx.pure.u32(quantity),
            ],
        });

        const result = await ctx.client.signAndExecuteTransaction({
            transaction: tx,
            signer: ctx.keypair,
            options: { showEffects: true },
        });

        console.log("Ordered", quantity, "items!");
        console.log("Transaction digest:", result.digest);
    } catch (error) {
        handleError(error);
    }
}

main();
