/**
 * Per-tenant world configuration.
 *
 * Mirrors wallet-core's `src/tenant/tenants.ts` (`TENANT_SOURCE`), the source
 * of truth for which tenants exist and which world tier each one runs. Keep the
 * two in sync. Several tenants share a world tier: same package, same shared
 * objects, different tenant string.
 *
 * `mvrName` selects the world package tier, resolved through the committed MVR
 * cache. The tier's shared `ObjectRegistry` and `AdminACL` aren't packages, so
 * MVR doesn't cover them; `pnpm gen:mvr` finds them on chain by their MVR type
 * and writes `worldObjects.generated.ts`.
 *
 * The tenant string itself is part of every `TenantItemId` key, so it must match
 * the game server exactly — a wrong tenant derives a valid-looking object ID for
 * an object that doesn't exist.
 */

export type TenantId =
    | "stillness"
    | "liminality"
    | "utopia"
    | "umbra"
    | "tauceti"
    | "tiaki"
    | "tetra"
    | "tesseract";

/**
 * The workshop world. wallet-core defaults to stillness; this repo defaults to
 * liminality because that's where the lab kits live.
 */
export const DEFAULT_TENANT: TenantId = "liminality";

export type WorldMvrName =
    | "@evefrontier/world"
    | "@evefrontier/world-uat"
    | "@evefrontier/world-test";

export interface WorldTier {
    /** Move build environment in world-contracts' Published.toml for this tier. */
    buildEnv: string;
}

export const WORLD_TIERS: Record<WorldMvrName, WorldTier> = {
    "@evefrontier/world": { buildEnv: "testnet_stillness" },
    "@evefrontier/world-uat": { buildEnv: "testnet_utopia" },
    "@evefrontier/world-test": { buildEnv: "testnet_internal" },
};

/** World tier each tenant runs. */
export const TENANT_WORLD: Record<TenantId, WorldMvrName> = {
    stillness: "@evefrontier/world",
    liminality: "@evefrontier/world",
    utopia: "@evefrontier/world-uat",
    umbra: "@evefrontier/world-uat",
    tauceti: "@evefrontier/world-test",
    tiaki: "@evefrontier/world-test",
    tetra: "@evefrontier/world-test",
    tesseract: "@evefrontier/world-test",
};

export interface TenantConfig extends WorldTier {
    /** World package tier, resolved via the MVR cache. */
    mvrName: WorldMvrName;
}

export const TENANT_CONFIG: Record<TenantId, TenantConfig> = Object.fromEntries(
    (Object.entries(TENANT_WORLD) as [TenantId, WorldMvrName][]).map(([tenant, mvrName]) => [
        tenant,
        { mvrName, ...WORLD_TIERS[mvrName] },
    ])
) as Record<TenantId, TenantConfig>;

export function isTenantId(value: string): value is TenantId {
    return value in TENANT_CONFIG;
}
