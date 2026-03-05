import "dotenv/config";
import { Transaction } from "@mysten/sui/transactions";
import { MODULES } from "./utils/config";
import {
    getEnvConfig,
    handleError,
    hydrateWorldConfig,
    initializeContext,
    requireEnv,
} from "./utils/helper";
import { deriveObjectId } from "./utils/derive-object-id";
import { GAME_CHARACTER_ID, GAME_CHARACTER_C_ID, ITEM_A_TYPE_ID, STORAGE_A_ITEM_ID } from "./utils/constants";
import { getCharacterOwnerCap } from "./helpers/character";
import { executeSponsoredTransaction } from "./utils/transaction";
import { readSeedResources, upsertSeedResources } from "./utils/config";

/**
 * Local seeding script — runs automatically at the end of setup-world-with-version.
 * Builders add their own seeding steps here.
 *
 * State is tracked in deployments/<network>/seed-resources.json.
 * Already-completed steps are skipped — safe to re-run at any time.
 * The file is cleared by rebuild-world, so re-seeding happens automatically after a chain reset.
 */

// ---------------------------------------------------------------------------
// Step: seed Player C's character-owned inventory on Storage Unit A.
// Required before list-item / buy-item in the marketplace flow.
//
// Player C is seeded with typeId 447 (distinct from Player B's typeId 446),
// so the marketplace example demonstrates a real item-for-item trade.
// Player B's items (typeId 446) are seeded by world-contracts' create-test-resources.
//
// Item ID 444000002 is distinct from Player B's item (444000001) so both
// can coexist on-chain. Override with env vars if needed.
//
// Env: PLAYER_C_PRIVATE_KEY, ADMIN_PRIVATE_KEY
//      SEED_TYPE_ID (default: 447), SEED_ITEM_ID (default: 444000002)
//      SEED_QUANTITY (default: 10), SEED_VOLUME (default: 10)
// ---------------------------------------------------------------------------
async function seedPlayerCInventory(env: ReturnType<typeof getEnvConfig>): Promise<void> {
    const seeds = readSeedResources(env.network);
    if (seeds.playerCInventory) {
        console.log("  [skip] Player C inventory already seeded");
        return;
    }

    const adminCtx = initializeContext(env.network, env.adminExportedKey);
    await hydrateWorldConfig(adminCtx);

    const playerKey = requireEnv("PLAYER_C_PRIVATE_KEY");
    const playerCtx = initializeContext(env.network, playerKey);
    playerCtx.config = adminCtx.config;

    const { config } = adminCtx;

    const storageUnitId = deriveObjectId(
        config.objectRegistry,
        STORAGE_A_ITEM_ID,
        config.packageId
    );
    const characterId = deriveObjectId(
        config.objectRegistry,
        BigInt(GAME_CHARACTER_C_ID),
        config.packageId
    );

    const ownerCapId = await getCharacterOwnerCap(
        characterId,
        adminCtx.client,
        config,
        playerCtx.address
    );
    if (!ownerCapId) {
        throw new Error(
            "OwnerCap not found for Player C's character. Make sure PLAYER_C_PRIVATE_KEY owns the character."
        );
    }

    // typeId 447: distinct from Player B's 446, making the marketplace a real cross-type trade.
    // itemId 444000002: distinct from Player B's 444000001 so both can coexist on-chain.
    const seedTypeId = BigInt(process.env.SEED_TYPE_ID ?? "447");
    const seedItemId = BigInt(process.env.SEED_ITEM_ID ?? "444000002");
    const quantity = Number(process.env.SEED_QUANTITY ?? "10");
    const volume = BigInt(process.env.SEED_VOLUME ?? "10");

    const tx = new Transaction();
    tx.setSender(playerCtx.address);
    tx.setGasOwner(adminCtx.address);

    const [ownerCap, returnReceipt] = tx.moveCall({
        target: `${config.packageId}::${MODULES.CHARACTER}::borrow_owner_cap`,
        typeArguments: [`${config.packageId}::${MODULES.CHARACTER}::Character`],
        arguments: [tx.object(characterId), tx.object(ownerCapId)],
    });

    tx.moveCall({
        target: `${config.packageId}::${MODULES.STORAGE_UNIT}::game_item_to_chain_inventory`,
        typeArguments: [`${config.packageId}::${MODULES.CHARACTER}::Character`],
        arguments: [
            tx.object(storageUnitId),
            tx.object(config.adminAcl),
            tx.object(characterId),
            ownerCap,
            tx.pure.u64(seedItemId),
            tx.pure.u64(seedTypeId),
            tx.pure.u64(volume),
            tx.pure.u32(quantity),
        ],
    });

    tx.moveCall({
        target: `${config.packageId}::${MODULES.CHARACTER}::return_owner_cap`,
        typeArguments: [`${config.packageId}::${MODULES.CHARACTER}::Character`],
        arguments: [tx.object(characterId), ownerCap, returnReceipt],
    });

    const result = await executeSponsoredTransaction(
        tx,
        adminCtx.client,
        playerCtx.keypair,
        adminCtx.keypair,
        playerCtx.address,
        adminCtx.address,
        { showEffects: true }
    );

    upsertSeedResources(env.network, (data) => {
        data.playerCInventory = {
            typeId: Number(seedTypeId),
            itemId: Number(seedItemId),
            quantity,
        };
    });

    console.log(`  [done] Player C inventory seeded: ${quantity}x typeId ${seedTypeId}`);
    console.log("         Transaction digest:", result.digest);
}

// ---------------------------------------------------------------------------
// Step: seed Player A's character-owned inventory on Storage Unit A.
// Required before stock-supply-unit in the supply unit flow.
//
// Player A is the admin/stocker: uses ITEM_A_TYPE_ID (446) — same type the
// supply unit sells. itemId 444000003 is distinct from Player B (444000001)
// and Player C (444000002).
//
// Env: PLAYER_A_PRIVATE_KEY, ADMIN_PRIVATE_KEY
//      SEED_PLAYER_A_ITEM_ID (default: 444000003)
//      SEED_PLAYER_A_QUANTITY (default: 20), SEED_PLAYER_A_VOLUME (default: 10)
// ---------------------------------------------------------------------------
async function seedPlayerAInventory(env: ReturnType<typeof getEnvConfig>): Promise<void> {
    const seeds = readSeedResources(env.network);
    if (seeds.playerAInventory) {
        console.log("  [skip] Player A inventory already seeded");
        return;
    }

    const adminCtx = initializeContext(env.network, env.adminExportedKey);
    await hydrateWorldConfig(adminCtx);

    const playerKey = requireEnv("PLAYER_A_PRIVATE_KEY");
    const playerCtx = initializeContext(env.network, playerKey);
    playerCtx.config = adminCtx.config;

    const { config } = adminCtx;

    const storageUnitId = deriveObjectId(config.objectRegistry, STORAGE_A_ITEM_ID, config.packageId);
    const characterId = deriveObjectId(config.objectRegistry, BigInt(GAME_CHARACTER_ID), config.packageId);

    const ownerCapId = await getCharacterOwnerCap(characterId, adminCtx.client, config, playerCtx.address);
    if (!ownerCapId) {
        throw new Error("OwnerCap not found for Player A's character. Make sure PLAYER_A_PRIVATE_KEY owns the character.");
    }

    // typeId 446: ITEM_A_TYPE_ID — matches what the supply unit sells.
    // itemId 444000003: distinct from Player B (444000001) and Player C (444000002).
    const seedItemId = BigInt(process.env.SEED_PLAYER_A_ITEM_ID ?? "444000003");
    const quantity = Number(process.env.SEED_PLAYER_A_QUANTITY ?? "20");
    const volume = BigInt(process.env.SEED_PLAYER_A_VOLUME ?? "10");

    const tx = new Transaction();
    tx.setSender(playerCtx.address);
    tx.setGasOwner(adminCtx.address);

    const [ownerCap, returnReceipt] = tx.moveCall({
        target: `${config.packageId}::${MODULES.CHARACTER}::borrow_owner_cap`,
        typeArguments: [`${config.packageId}::${MODULES.CHARACTER}::Character`],
        arguments: [tx.object(characterId), tx.object(ownerCapId)],
    });

    tx.moveCall({
        target: `${config.packageId}::${MODULES.STORAGE_UNIT}::game_item_to_chain_inventory`,
        typeArguments: [`${config.packageId}::${MODULES.CHARACTER}::Character`],
        arguments: [
            tx.object(storageUnitId),
            tx.object(config.adminAcl),
            tx.object(characterId),
            ownerCap,
            tx.pure.u64(seedItemId),
            tx.pure.u64(ITEM_A_TYPE_ID),
            tx.pure.u64(volume),
            tx.pure.u32(quantity),
        ],
    });

    tx.moveCall({
        target: `${config.packageId}::${MODULES.CHARACTER}::return_owner_cap`,
        typeArguments: [`${config.packageId}::${MODULES.CHARACTER}::Character`],
        arguments: [tx.object(characterId), ownerCap, returnReceipt],
    });

    const result = await executeSponsoredTransaction(
        tx,
        adminCtx.client,
        playerCtx.keypair,
        adminCtx.keypair,
        playerCtx.address,
        adminCtx.address,
        { showEffects: true }
    );

    upsertSeedResources(env.network, (data) => {
        data.playerAInventory = {
            typeId: Number(ITEM_A_TYPE_ID),
            itemId: Number(seedItemId),
            quantity,
        };
    });

    console.log(`  [done] Player A inventory seeded: ${quantity}x typeId ${ITEM_A_TYPE_ID}`);
    console.log("         Transaction digest:", result.digest);
}

// ---------------------------------------------------------------------------
// Main — add more seeding steps here as needed
// ---------------------------------------------------------------------------
async function main() {
    console.log("============= Local Seeding ==============\n");

    try {
        const env = getEnvConfig();
        console.log(`Network: ${env.network}`);
        console.log(`Seed state: deployments/${env.network}/seed-resources.json\n`);

        await seedPlayerAInventory(env);
        // Brief pause so the node reflects the admin gas coin version from the previous tx
        await new Promise(r => setTimeout(r, 1500));
        await seedPlayerCInventory(env);

        // await seedMyCustomStep(env);   // add your steps here

        console.log("\nSeeding complete.");
    } catch (error) {
        handleError(error);
    }
}

main();
