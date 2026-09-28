import { bcs } from "@mysten/sui/bcs";
import { deriveObjectID } from "@mysten/sui/utils";
import { worldType } from "../mvr/resolve";
import type { WorldConfig } from "./config";

const TenantItemId = bcs.struct("TenantItemId", {
    item_id: bcs.u64(),
    tenant: bcs.string(),
});

/**
 * Derive the on-chain object ID of an in-game item (character, gate, storage
 * unit, …) from its in-game item ID. Pure and offline.
 *
 * The key type is the *type-origin* `TenantItemId` tag, not the latest world
 * package — using the wrong one yields a valid-looking ID for an object that
 * doesn't exist.
 */
export function deriveObjectId(config: WorldConfig, itemId: number | bigint): string {
    const key = TenantItemId.serialize({
        item_id: BigInt(itemId),
        tenant: config.tenant,
    }).toBytes();
    return deriveObjectID(config.objectRegistry, worldType("in_game_id::TenantItemId"), key);
}
