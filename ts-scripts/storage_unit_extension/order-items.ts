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
import { GAME_CHARACTER_B_ID, STORAGE_A_ITEM_ID } from "../utils/constants";
import { requireStorageUnitExtensionPackageId, resolveSupplyUnitId } from "./extension-ids";
import { resolveCurrencyTokenIds } from "../currency_token/ids";
import { MODULE } from "./modules";

/**
 * Player B orders items by paying with CURRENCY_TOKEN (highest-balance coin auto-selected).
 * Extension splits exact payment, transfers to collection address, deposits items to buyer ephemeral.
 *
 * Env: STORAGE_UNIT_EXTENSION_PACKAGE_ID, SUPPLY_UNIT_ID (or runtime-object-ids.json)
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
        const storageUnitId = deriveObjectId(ctx.config.objectRegistry, STORAGE_A_ITEM_ID, ctx.config.packageId);
        const buyerCharacterId = deriveObjectId(ctx.config.objectRegistry, BigInt(GAME_CHARACTER_B_ID), ctx.config.packageId);
        const quantity = Number(process.env.ORDER_QUANTITY ?? "1");

        const tokenIds = resolveCurrencyTokenIds(env.network);
        const coinType = `${tokenIds.packageId}::currency_token::CURRENCY_TOKEN`;
        const coins = await ctx.client.getCoins({ owner: ctx.address, coinType });
        if (!coins.data.length) {
            throw new Error(`No ${coinType} coins found. Run mint-currency-token first.`);
        }
        const coinObjectId = coins.data.reduce((best, c) =>
            BigInt(c.balance) > BigInt(best.balance) ? c : best
        ).coinObjectId;

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
