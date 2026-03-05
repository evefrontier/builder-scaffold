import "dotenv/config";
import { Transaction } from "@mysten/sui/transactions";
import { MODULES } from "../utils/config";
import { deriveObjectId } from "../utils/derive-object-id";
import {
    GAME_CHARACTER_ID,
    GATE_ITEM_ID_1,
    GATE_ITEM_ID_2,
    STORAGE_A_ITEM_ID,
} from "../utils/constants";
import {
    getEnvConfig,
    handleError,
    hydrateWorldConfig,
    initializeContext,
    requireEnv,
    delay,
    DELAY_MS,
} from "../utils/helper";
import { requireGateExtensionPackageId } from "./extension-ids";
import { getOwnerCap as getGateOwnerCap } from "../helpers/gate";
import { getOwnerCap as getStorageUnitOwnerCap } from "../helpers/storage-unit";
import { MODULE } from "./modules";

async function authoriseGate(
    ctx: ReturnType<typeof initializeContext>,
    gateItemId: bigint,
    characterItemId: bigint
) {
    const { client, keypair, config, address } = ctx;
    const builderPackageId = requireGateExtensionPackageId();

    const characterId = deriveObjectId(config.objectRegistry, characterItemId, config.packageId);
    const gateId = deriveObjectId(config.objectRegistry, gateItemId, config.packageId);

    const gateOwnerCapId = await getGateOwnerCap(gateId, client, config, address);
    if (!gateOwnerCapId) {
        throw new Error(`OwnerCap not found for gate ${gateId}`);
    }

    const authType = `${builderPackageId}::${MODULE.CONFIG}::XAuth`;

    const tx = new Transaction();

    const [gateOwnerCap, returnReceipt] = tx.moveCall({
        target: `${config.packageId}::${MODULES.CHARACTER}::borrow_owner_cap`,
        typeArguments: [`${config.packageId}::${MODULES.GATE}::Gate`],
        arguments: [tx.object(characterId), tx.object(gateOwnerCapId)],
    });

    tx.moveCall({
        target: `${config.packageId}::${MODULES.GATE}::authorize_extension`,
        typeArguments: [authType],
        arguments: [tx.object(gateId), gateOwnerCap],
    });

    tx.moveCall({
        target: `${config.packageId}::${MODULES.CHARACTER}::return_owner_cap`,
        typeArguments: [`${config.packageId}::${MODULES.GATE}::Gate`],
        arguments: [tx.object(characterId), gateOwnerCap, returnReceipt],
    });

    const result = await client.signAndExecuteTransaction({
        transaction: tx,
        signer: keypair,
        options: { showEffects: true, showObjectChanges: true, showEvents: true },
    });

    console.log("XAuth authorized on gate!", gateId);
    console.log("Transaction digest:", result.digest);
}

/**
 * Authorizes XAuth on the storage unit — required for the corpse bounty path,
 * which deposits a reward item into the storage unit using XAuth.
 */
async function authoriseStorageUnitXAuth(
    ctx: ReturnType<typeof initializeContext>,
    storageUnitItemId: bigint,
    characterItemId: bigint
) {
    const { client, keypair, config, address } = ctx;
    const builderPackageId = requireGateExtensionPackageId();

    const characterId = deriveObjectId(config.objectRegistry, characterItemId, config.packageId);
    const storageUnitId = deriveObjectId(
        config.objectRegistry,
        storageUnitItemId,
        config.packageId
    );

    const storageUnitOwnerCapId = await getStorageUnitOwnerCap(
        storageUnitId,
        client,
        config,
        address
    );
    if (!storageUnitOwnerCapId) {
        throw new Error(`OwnerCap not found for storage unit ${storageUnitId}`);
    }

    const authType = `${builderPackageId}::${MODULE.CONFIG}::XAuth`;

    const tx = new Transaction();

    const [storageUnitOwnerCap, returnReceipt] = tx.moveCall({
        target: `${config.packageId}::${MODULES.CHARACTER}::borrow_owner_cap`,
        typeArguments: [`${config.packageId}::${MODULES.STORAGE_UNIT}::StorageUnit`],
        arguments: [tx.object(characterId), tx.object(storageUnitOwnerCapId)],
    });

    tx.moveCall({
        target: `${config.packageId}::${MODULES.STORAGE_UNIT}::authorize_extension`,
        typeArguments: [authType],
        arguments: [tx.object(storageUnitId), storageUnitOwnerCap],
    });

    tx.moveCall({
        target: `${config.packageId}::${MODULES.CHARACTER}::return_owner_cap`,
        typeArguments: [`${config.packageId}::${MODULES.STORAGE_UNIT}::StorageUnit`],
        arguments: [tx.object(characterId), storageUnitOwnerCap, returnReceipt],
    });

    const result = await client.signAndExecuteTransaction({
        transaction: tx,
        signer: keypair,
        options: { showEffects: true, showObjectChanges: true, showEvents: true },
    });

    console.log("XAuth authorized on storage unit!", storageUnitId);
    console.log("Transaction digest:", result.digest);
}

async function main() {
    console.log("============= Authorise Gate Extension ==============\n");
    try {
        const env = getEnvConfig();
        const playerKey = requireEnv("PLAYER_A_PRIVATE_KEY");
        const ctx = initializeContext(env.network, playerKey);
        await hydrateWorldConfig(ctx);

        // Authorize XAuth on both gates
        await authoriseGate(ctx, GATE_ITEM_ID_1, BigInt(GAME_CHARACTER_ID));
        await delay(DELAY_MS);
        await authoriseGate(ctx, GATE_ITEM_ID_2, BigInt(GAME_CHARACTER_ID));
        await delay(DELAY_MS);

        // Authorize XAuth on the storage unit (required for the corpse bounty path)
        await authoriseStorageUnitXAuth(ctx, STORAGE_A_ITEM_ID, BigInt(GAME_CHARACTER_ID));
    } catch (error) {
        handleError(error);
    }
}

main();
