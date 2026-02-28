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
import { getCharacterOwnerCap } from "../helpers/character";
import { MODULE } from "./modules";

/**
 * Admin stocks supply unit by withdrawing items from their ephemeral and depositing to main.
 * Admin must have items in their ephemeral inventory first (e.g. from game or test mint).
 *
 * Env: STORAGE_UNIT_EXTENSION_PACKAGE_ID, SUPPLY_UNIT_ID, STORAGE_UNIT_ID
 *      ADMIN_CHARACTER_ID, ITEM_TYPE_ID, ITEM_QUANTITY
 *      ADMIN_PRIVATE_KEY
 */
async function main() {
    console.log("============= Stock Supply Unit ==============\n");

    try {
        const env = getEnvConfig();
        const adminKey = requireEnv("ADMIN_PRIVATE_KEY");
        const ctx = initializeContext(env.network, adminKey);
        await hydrateWorldConfig(ctx);

        const packageId = requireStorageUnitExtensionPackageId();
        const supplyUnitId = resolveSupplyUnitId();
        const storageUnitId = requireEnv("STORAGE_UNIT_ID");
        const adminCharacterId = requireEnv("ADMIN_CHARACTER_ID");
        const itemTypeId = BigInt(process.env.ITEM_TYPE_ID ?? "88070");
        const quantity = Number(process.env.ITEM_QUANTITY ?? "5");

        let adminOwnerCapId = process.env.ADMIN_OWNER_CAP_ID;
        if (!adminOwnerCapId) {
            adminOwnerCapId = await getCharacterOwnerCap(
                adminCharacterId,
                ctx.client,
                ctx.config,
                ctx.address
            ) ?? undefined;
        }
        if (!adminOwnerCapId) {
            throw new Error("ADMIN_OWNER_CAP_ID required, or Character must have OwnerCap");
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
