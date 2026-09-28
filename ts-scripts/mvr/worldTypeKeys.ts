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
 * Fully-qualified MVR type-name literals. Only exists so the `@mysten/mvr-static`
 * scanner (which matches literal `@name::module::Type` strings, not
 * dynamically-built ones) discovers what to resolve. Not read at runtime — the
 * generated cache is. Keep in sync with {@link WORLD_TYPE_KEYS}.
 */
export const MVR_SCAN_SEED = [
    "@evefrontier/world::access::OwnerCap",
    "@evefrontier/world::character::Character",
    "@evefrontier/world::gate::Gate",
    "@evefrontier/world::gate::JumpEvent",
    "@evefrontier/world::gate::JumpPermit",
    "@evefrontier/world::in_game_id::TenantItemId",
    "@evefrontier/world::object_registry::ObjectRegistry",
    "@evefrontier/world::storage_unit::StorageUnit",
] as const;
