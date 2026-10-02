/**
 * World Move types the scripts interpolate into type tags: `typeArguments`,
 * `StructType` filters, event filters, and the `TenantItemId` key used to
 * derive object IDs.
 *
 * Each Move type is pinned to the package version in which it was FIRST
 * defined (its type-origin), which is not necessarily the latest upgrade. A
 * single world package ID therefore cannot be interpolated into every type
 * string; each type is resolved individually. `mvrCache.generated.ts` embeds
 * those resolutions — regenerate it with `pnpm gen:mvr` after a world upgrade.
 */

/** Short `module::Type` keys, the single source of truth for what we resolve. */
export const WORLD_TYPE_KEYS = [
    "access::AdminACL",
    "access::OwnerCap",
    "character::Character",
    "gate::Gate",
    "gate::JumpEvent",
    "gate::JumpPermit",
    "in_game_id::TenantItemId",
    "object_registry::ObjectRegistry",
    "storage_unit::StorageUnit",
] as const;

export type WorldTypeKey = (typeof WORLD_TYPE_KEYS)[number];

/**
 * Fully-qualified MVR type-name literals, for every world tier in tenants.ts.
 * Only exists so the `@mysten/mvr-static` scanner (which matches literal
 * `@name::module::Type` strings, not dynamically-built ones) discovers what to
 * resolve. Not read at runtime — the generated cache is. Keep in sync with
 * {@link WORLD_TYPE_KEYS} and `WORLD_TIERS`.
 */
export const MVR_SCAN_SEED = [
    "@evefrontier/world::access::AdminACL",
    "@evefrontier/world::access::OwnerCap",
    "@evefrontier/world::character::Character",
    "@evefrontier/world::gate::Gate",
    "@evefrontier/world::gate::JumpEvent",
    "@evefrontier/world::gate::JumpPermit",
    "@evefrontier/world::in_game_id::TenantItemId",
    "@evefrontier/world::object_registry::ObjectRegistry",
    "@evefrontier/world::storage_unit::StorageUnit",
    "@evefrontier/world-uat::access::AdminACL",
    "@evefrontier/world-uat::access::OwnerCap",
    "@evefrontier/world-uat::character::Character",
    "@evefrontier/world-uat::gate::Gate",
    "@evefrontier/world-uat::gate::JumpEvent",
    "@evefrontier/world-uat::gate::JumpPermit",
    "@evefrontier/world-uat::in_game_id::TenantItemId",
    "@evefrontier/world-uat::object_registry::ObjectRegistry",
    "@evefrontier/world-uat::storage_unit::StorageUnit",
    "@evefrontier/world-test::access::AdminACL",
    "@evefrontier/world-test::access::OwnerCap",
    "@evefrontier/world-test::character::Character",
    "@evefrontier/world-test::gate::Gate",
    "@evefrontier/world-test::gate::JumpEvent",
    "@evefrontier/world-test::gate::JumpPermit",
    "@evefrontier/world-test::in_game_id::TenantItemId",
    "@evefrontier/world-test::object_registry::ObjectRegistry",
    "@evefrontier/world-test::storage_unit::StorageUnit",
] as const;
