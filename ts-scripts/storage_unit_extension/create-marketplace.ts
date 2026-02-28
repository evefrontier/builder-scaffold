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
import { requireStorageUnitExtensionPackageId } from "./extension-ids";
import { getOwnerCap as getStorageUnitOwnerCap } from "../helpers/storage-unit";
import { MODULE } from "./modules";

/**
 * Create marketplace for a storage unit and authorize MarketAuth.
 * Run as storage unit owner.
 *
 * Env: STORAGE_UNIT_EXTENSION_PACKAGE_ID, STORAGE_UNIT_ID, CHARACTER_ID
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
        const storageUnitId = requireEnv("STORAGE_UNIT_ID");
        const characterId = requireEnv("CHARACTER_ID");

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
            console.log("Add to .env: MARKETPLACE_ID=" + marketplaceId);
        }
        console.log("Transaction digest:", result.digest);
    } catch (error) {
        handleError(error);
    }
}

main();
