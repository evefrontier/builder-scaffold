import { getMvrCache } from "./mvrCache.generated";
import {
    DEFAULT_TENANT,
    TENANT_CONFIG,
    isTenantId,
    type TenantConfig,
    type TenantId,
} from "./tenants";
import type { WorldTypeKey } from "./worldTypeKeys";

/** Every EVE Frontier world tier is published on Sui testnet. */
export const WORLD_MVR_NETWORK = "testnet" as const;

type MvrResolution = {
    packages: Record<string, string>;
    types: Record<string, string>;
};

const mvrCache = getMvrCache(WORLD_MVR_NETWORK) as MvrResolution;

/** Cache as the Sui client's MVR `overrides`, so named targets resolve without a network call. */
export const MVR_OVERRIDES = mvrCache;

export function currentTenant(): TenantId {
    const tenant = process.env.TENANT || DEFAULT_TENANT;
    if (!isTenantId(tenant)) {
        throw new Error(
            `Unknown TENANT "${tenant}". Supported: ${Object.keys(TENANT_CONFIG).join(", ")}.`
        );
    }
    return tenant;
}

export function tenantConfig(tenant: TenantId = currentTenant()): TenantConfig {
    return TENANT_CONFIG[tenant];
}

/**
 * Latest world package ID — use for `moveCall` targets.
 * Never use it in a type tag; see {@link worldType}.
 */
export function worldPackage(tenant: TenantId = currentTenant()): string {
    const { mvrName } = tenantConfig(tenant);
    const packageId = mvrCache.packages[mvrName];
    if (!packageId) {
        throw new Error(
            `MVR cache has no package entry for "${mvrName}". Regenerate it with \`pnpm gen:mvr\`.`
        );
    }
    return packageId;
}

/** `moveCall` target on the latest world package, e.g. `worldTarget("gate::authorize_extension")`. */
export function worldTarget(moduleAndFunction: string, tenant: TenantId = currentTenant()): string {
    return `${worldPackage(tenant)}::${moduleAndFunction}`;
}

/**
 * Fully-qualified type-origin tag for a world type, e.g. `0x…::gate::Gate` —
 * use for `typeArguments`, `StructType` filters, event filters and object ID
 * derivation. Each type is pinned to the package version it was first defined
 * in, which can differ from {@link worldPackage} after an upgrade.
 */
export function worldType(key: WorldTypeKey, tenant: TenantId = currentTenant()): string {
    const fullName = `${tenantConfig(tenant).mvrName}::${key}`;
    const tag = mvrCache.types[fullName];
    if (!tag) {
        throw new Error(
            `MVR cache has no type-origin entry for "${fullName}". Add it to ` +
                `ts-scripts/mvr/worldTypeKeys.ts and regenerate with \`pnpm gen:mvr\`.`
        );
    }
    return tag;
}
