import "dotenv/config";
import { Transaction } from "@mysten/sui/transactions";
import { MODULES, readRuntimeObjectIds, writeRuntimeObjectIds } from "../utils/config";
import {
    getEnvConfig,
    handleError,
    hydrateWorldConfig,
    initializeContext,
    requireEnv,
} from "../utils/helper";
import { deriveObjectId } from "../utils/derive-object-id";
import { GAME_CHARACTER_ID, STORAGE_A_ITEM_ID } from "../utils/constants";
import { requireStorageUnitExtensionPackageId } from "./extension-ids";
import { getOwnerCap as getStorageUnitOwnerCap } from "../helpers/storage-unit";
import { MODULE } from "./modules";

/**
 * Create marketplace for a storage unit and authorize MarketAuth.
 * Run as Player A (storage unit owner).
 *
 * Env: STORAGE_UNIT_EXTENSION_PACKAGE_ID (or extracted-object-ids.json)
 *      PLAYER_A_PRIVATE_KEY (storage unit owner)
 */
async function main() {
    console.log("============= Create Marketplace ==============\n");

    try {
        const env = getEnvConfig();
        const playerKey = requireEnv("PLAYER_A_PRIVATE_KEY");
        const ctx = initializeContext(env.network, playerKey);
        await hydrateWorldConfig(ctx);

        const packageId = requireStorageUnitExtensionPackageId();
        const storageUnitId = deriveObjectId(ctx.config.objectRegistry, STORAGE_A_ITEM_ID, ctx.config.packageId);
        const characterId = deriveObjectId(ctx.config.objectRegistry, BigInt(GAME_CHARACTER_ID), ctx.config.packageId);

        const storageUnitOwnerCapId = await getStorageUnitOwnerCap(
            storageUnitId,
            ctx.client,
            ctx.config,
            ctx.address
        );
        if (!storageUnitOwnerCapId) {
            throw new Error(`OwnerCap not found for storage unit ${storageUnitId}`);
        }

        const tx = new Transaction();

        const [storageUnitOwnerCap, returnReceipt] = tx.moveCall({
            target: `${ctx.config.packageId}::${MODULES.CHARACTER}::borrow_owner_cap`,
            typeArguments: [`${ctx.config.packageId}::${MODULES.STORAGE_UNIT}::StorageUnit`],
            arguments: [tx.object(characterId), tx.object(storageUnitOwnerCapId)],
        });

        tx.moveCall({
            target: `${packageId}::${MODULE.MARKETPLACE}::create_marketplace`,
            arguments: [tx.object(storageUnitId), storageUnitOwnerCap],
        });

        tx.moveCall({
            target: `${ctx.config.packageId}::${MODULES.STORAGE_UNIT}::authorize_extension`,
            typeArguments: [`${packageId}::${MODULE.MARKETPLACE}::MarketAuth`],
            arguments: [tx.object(storageUnitId), storageUnitOwnerCap],
        });

        tx.moveCall({
            target: `${ctx.config.packageId}::${MODULES.CHARACTER}::return_owner_cap`,
            typeArguments: [`${ctx.config.packageId}::${MODULES.STORAGE_UNIT}::StorageUnit`],
            arguments: [tx.object(characterId), storageUnitOwnerCap, returnReceipt],
        });

        const result = await ctx.client.signAndExecuteTransaction({
            transaction: tx,
            signer: ctx.keypair,
            options: { showEffects: true, showObjectChanges: true },
        });

        const created = result.objectChanges?.filter(
            (c) => c.type === "created" && "objectType" in c && c.objectType?.includes("Marketplace")
        );
        const marketplaceId = created?.[0] && "objectId" in created[0] ? created[0].objectId : null;

        console.log("Marketplace created!");
        if (marketplaceId) {
            const runtime = readRuntimeObjectIds(env.network);
            runtime.storage_unit_extension = { ...runtime.storage_unit_extension, marketplaceId };
            writeRuntimeObjectIds(env.network, runtime);
            console.log(`Marketplace ID written to runtime-object-ids.json`);
            console.log("Add to .env (or rely on runtime-object-ids.json): MARKETPLACE_ID=" + marketplaceId);
        }
        console.log("Transaction digest:", result.digest);
    } catch (error) {
        handleError(error);
    }
}

main();
