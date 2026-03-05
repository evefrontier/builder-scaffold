/// Example gate extension combining two access paths under one `ExtensionConfig`:
///
/// - **Tribe path** (`issue_via_tribe`): Characters belonging to the configured tribe may jump
///   for free — no item payment required.
/// - **Bounty path** (`issue_via_bounty`): Any character may jump by submitting a corpse item
///   as payment, regardless of tribe.
///
/// Gate owners configure each path independently via `set_tribe_config` / `set_bounty_config`.
/// Both paths call `world::gate::issue_jump_permit<XAuth>` with the same typed witness,
/// so only one `authorize_extension<XAuth>` call is needed per gate.
module smart_gate_extension::tribe_or_bounty_permit;

use smart_gate_extension::config::{Self, AdminCap, XAuth, ExtensionConfig};
use sui::clock::Clock;
use world::{access::OwnerCap, character::Character, gate::{Self, Gate}, storage_unit::StorageUnit};

// === Errors ===
#[error(code = 0)]
const ENoTribeConfig: vector<u8> = b"Missing TribeConfig on ExtensionConfig";
#[error(code = 1)]
const ENoBountyConfig: vector<u8> = b"Missing BountyConfig on ExtensionConfig";
#[error(code = 2)]
const ENotPermittedTribe: vector<u8> = b"Character tribe does not match the permitted tribe";
#[error(code = 3)]
const ECorpseTypeIdEmpty: vector<u8> = b"Bounty type id must be non-zero";
#[error(code = 4)]
const EExpiryOverflow: vector<u8> = b"Expiry timestamp overflow";

// === Tribe config ===

/// Stored as a dynamic field value under `ExtensionConfig`.
public struct TribeConfig has drop, store {
    tribe: u32,
    expiry_duration_ms: u64,
}

/// Dynamic-field key for `TribeConfig`.
public struct TribeConfigKey has copy, drop, store {}

// === Bounty config ===

/// Stored as a dynamic field value under `ExtensionConfig`.
public struct BountyConfig has drop, store {
    bounty_type_id: u64,
    expiry_duration_ms: u64,
}

/// Dynamic-field key for `BountyConfig`.
public struct BountyConfigKey has copy, drop, store {}

// === Tribe path ===

/// Issue a `JumpPermit` to characters belonging to the configured tribe (no payment required).
public fun issue_via_tribe(
    extension_config: &ExtensionConfig,
    source_gate: &Gate,
    destination_gate: &Gate,
    character: &Character,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    assert!(extension_config.has_rule<TribeConfigKey>(TribeConfigKey {}), ENoTribeConfig);
    let tribe_cfg = extension_config.borrow_rule<TribeConfigKey, TribeConfig>(TribeConfigKey {});

    assert!(character.tribe() == tribe_cfg.tribe, ENotPermittedTribe);

    let expiry_ms = tribe_cfg.expiry_duration_ms;
    let ts = clock.timestamp_ms();
    assert!(ts <= (0xFFFFFFFFFFFFFFFFu64 - expiry_ms), EExpiryOverflow);
    gate::issue_jump_permit<XAuth>(
        source_gate,
        destination_gate,
        character,
        config::x_auth(),
        ts + expiry_ms,
        ctx,
    );
}

// === Bounty path ===

/// Issue a `JumpPermit` by submitting one corpse item as payment (any tribe accepted).
/// Withdraws 1 item of `bounty_type_id` from the player's owned inventory section
/// and deposits it into the storage unit via the extension witness.
public fun issue_via_bounty<T: key>(
    extension_config: &ExtensionConfig,
    storage_unit: &mut StorageUnit,
    source_gate: &Gate,
    destination_gate: &Gate,
    character: &Character,
    player_inventory_owner_cap: &OwnerCap<T>,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    assert!(extension_config.has_rule<BountyConfigKey>(BountyConfigKey {}), ENoBountyConfig);
    let bounty_cfg = extension_config.borrow_rule<
        BountyConfigKey,
        BountyConfig,
    >(BountyConfigKey {});

    let corpse = storage_unit.withdraw_by_owner<T>(
        character,
        player_inventory_owner_cap,
        bounty_cfg.bounty_type_id,
        1u32,
        ctx,
    );
    storage_unit.deposit_item<XAuth>(character, corpse, config::x_auth(), ctx);

    let expiry_ms = bounty_cfg.expiry_duration_ms;
    let ts = clock.timestamp_ms();
    assert!(ts <= (0xFFFFFFFFFFFFFFFFu64 - expiry_ms), EExpiryOverflow);
    gate::issue_jump_permit<XAuth>(
        source_gate,
        destination_gate,
        character,
        config::x_auth(),
        ts + expiry_ms,
        ctx,
    );
}

// === View functions ===

public fun tribe(extension_config: &ExtensionConfig): u32 {
    assert!(extension_config.has_rule<TribeConfigKey>(TribeConfigKey {}), ENoTribeConfig);
    extension_config.borrow_rule<TribeConfigKey, TribeConfig>(TribeConfigKey {}).tribe
}

public fun tribe_expiry_duration_ms(extension_config: &ExtensionConfig): u64 {
    assert!(extension_config.has_rule<TribeConfigKey>(TribeConfigKey {}), ENoTribeConfig);
    extension_config.borrow_rule<TribeConfigKey, TribeConfig>(TribeConfigKey {}).expiry_duration_ms
}

public fun bounty_type_id(extension_config: &ExtensionConfig): u64 {
    assert!(extension_config.has_rule<BountyConfigKey>(BountyConfigKey {}), ENoBountyConfig);
    extension_config.borrow_rule<BountyConfigKey, BountyConfig>(BountyConfigKey {}).bounty_type_id
}

public fun bounty_expiry_duration_ms(extension_config: &ExtensionConfig): u64 {
    assert!(extension_config.has_rule<BountyConfigKey>(BountyConfigKey {}), ENoBountyConfig);
    extension_config
        .borrow_rule<BountyConfigKey, BountyConfig>(BountyConfigKey {})
        .expiry_duration_ms
}

// === Admin functions ===

public fun set_tribe_config(
    extension_config: &mut ExtensionConfig,
    admin_cap: &AdminCap,
    tribe: u32,
    expiry_duration_ms: u64,
) {
    extension_config.set_rule<TribeConfigKey, TribeConfig>(
        admin_cap,
        TribeConfigKey {},
        TribeConfig { tribe, expiry_duration_ms },
    );
}

public fun set_bounty_config(
    extension_config: &mut ExtensionConfig,
    admin_cap: &AdminCap,
    bounty_type_id: u64,
    expiry_duration_ms: u64,
) {
    assert!(bounty_type_id != 0, ECorpseTypeIdEmpty);
    extension_config.set_rule<BountyConfigKey, BountyConfig>(
        admin_cap,
        BountyConfigKey {},
        BountyConfig { bounty_type_id, expiry_duration_ms },
    );
}
