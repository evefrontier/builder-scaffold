/**
 * Per-tenant world configuration.
 *
 * `mvrName` selects the world package tier, resolved through the committed MVR
 * cache. `objectRegistry` and `adminAcl` are shared objects rather than
 * packages, so MVR doesn't cover them; they're hardcoded here and must be
 * updated alongside a world redeploy.
 *
 * The tenant string itself is part of every `TenantItemId` key, so it must match
 * the game server exactly — a wrong tenant derives a valid-looking object ID for
 * an object that doesn't exist.
 */

export type TenantId = "liminality";

export interface TenantConfig {
    /** World package tier, resolved via the MVR cache. */
    mvrName: string;
    /** Shared `object_registry::ObjectRegistry`, used to derive object IDs. */
    objectRegistry: string;
    /** Shared `access::AdminACL`, required by `gate::jump_with_permit`. */
    adminAcl: string;
    /** Move build environment in world-contracts' Published.toml for this tier. */
    buildEnv: string;
}

export const TENANT_CONFIG: Record<TenantId, TenantConfig> = {
    liminality: {
        mvrName: "@evefrontier/world",
        objectRegistry: "0x8fd47e6e5cf8cb9b789cef26fbb674be819d8abd6afccaf50e95451212f0813a",
        adminAcl: "0xcb4f47804533a80b3854b33b37514ff03b1d7a4debad84bacdbe9fed5bfbf34f",
        // Liminality shares the @evefrontier/world package with Stillness.
        buildEnv: "testnet_stillness",
    },
};

export function isTenantId(value: string): value is TenantId {
    return value in TENANT_CONFIG;
}
