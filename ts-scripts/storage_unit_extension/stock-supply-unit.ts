import "dotenv/config";
import { Transaction } from "@mysten/sui/transactions";
import { MODULES, readSeedResources } from "../utils/config";
import {
    getEnvConfig,
    handleError,
    hydrateWorldConfig,
    initializeContext,
    requireEnv,
} from "../utils/helper";
import { deriveObjectId } from "../utils/derive-object-id";
import { GAME_CHARACTER_ID, STORAGE_A_ITEM_ID } from "../utils/constants";
import { requireStorageUnitExtensionPackageId, resolveSupplyUnitId } from "./extension-ids";
import { getCharacterOwnerCap } from "../helpers/character";
import { MODULE } from "./modules";

/**
 * Player A stocks supply unit by withdrawing items from their character-owned inventory.
 * Player A's character-owned inventory is seeded automatically by pnpm seed (via setup-world-with-version).
 * itemTypeId defaults to seeds.playerAInventory.typeId from seed-resources.json.
 *
 * Env: STORAGE_UNIT_EXTENSION_PACKAGE_ID, SUPPLY_UNIT_ID (or runtime-object-ids.json)
 *      ITEM_TYPE_ID (default: from seed-resources.json), ITEM_QUANTITY (default: 5)
 *      PLAYER_A_PRIVATE_KEY
 */
async function main() {
    console.log("============= Stock Supply Unit ==============\n");

    try {
        const env = getEnvConfig();

        const seeds = readSeedResources(env.network);
        if (!seeds.playerAInventory) {
            throw new Error(
                "Player A inventory not seeded. Run: pnpm seed\n" +
                "(setup-world-with-version does this automatically — re-run it or run pnpm seed manually)"
            );
        }

        const adminKey = requireEnv("PLAYER_A_PRIVATE_KEY");
        const ctx = initializeContext(env.network, adminKey);
        await hydrateWorldConfig(ctx);

        const packageId = requireStorageUnitExtensionPackageId();
        const supplyUnitId = resolveSupplyUnitId();
        const storageUnitId = deriveObjectId(ctx.config.objectRegistry, STORAGE_A_ITEM_ID, ctx.config.packageId);
        const adminCharacterId = deriveObjectId(ctx.config.objectRegistry, BigInt(GAME_CHARACTER_ID), ctx.config.packageId);
        const seededTypeId = BigInt((seeds.playerAInventory as { typeId: number }).typeId);
        const itemTypeId = BigInt(process.env.ITEM_TYPE_ID ?? String(seededTypeId));
        const quantity = Number(process.env.ITEM_QUANTITY ?? "5");

        const adminOwnerCapId = await getCharacterOwnerCap(
            adminCharacterId,
            ctx.client,
            ctx.config,
            ctx.address
        ) ?? undefined;
        if (!adminOwnerCapId) {
            throw new Error("OwnerCap not found for Player A character. Make sure PLAYER_A_PRIVATE_KEY owns the character.");
        }

        const tx = new Transaction();

        const [ownerCap, returnReceipt] = tx.moveCall({
            target: `${ctx.config.packageId}::${MODULES.CHARACTER}::borrow_owner_cap`,
            typeArguments: [`${ctx.config.packageId}::${MODULES.CHARACTER}::Character`],
            arguments: [tx.object(adminCharacterId), tx.object(adminOwnerCapId)],
        });

        const [item] = tx.moveCall({
            target: `${ctx.config.packageId}::${MODULES.STORAGE_UNIT}::withdraw_by_owner`,
            typeArguments: [`${ctx.config.packageId}::${MODULES.CHARACTER}::Character`],
            arguments: [
                tx.object(storageUnitId),
                tx.object(adminCharacterId),
                ownerCap,
                tx.pure.u64(itemTypeId),
                tx.pure.u32(quantity),
            ],
        });

        tx.moveCall({
            target: `${packageId}::${MODULE.SUPPLY_UNIT}::stock_supply_unit`,
            arguments: [
                tx.object(supplyUnitId),
                tx.object(storageUnitId),
                tx.object(adminCharacterId),
                item,
            ],
        });

        tx.moveCall({
            target: `${ctx.config.packageId}::${MODULES.CHARACTER}::return_owner_cap`,
            typeArguments: [`${ctx.config.packageId}::${MODULES.CHARACTER}::Character`],
            arguments: [tx.object(adminCharacterId), ownerCap, returnReceipt],
        });

        const result = await ctx.client.signAndExecuteTransaction({
            transaction: tx,
            signer: ctx.keypair,
            options: { showEffects: true },
        });

        console.log("Supply unit stocked with", quantity, "items!");
        console.log("Transaction digest:", result.digest);
    } catch (error) {
        handleError(error);
    }
}

main();
