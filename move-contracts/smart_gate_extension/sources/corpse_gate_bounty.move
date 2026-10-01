/// Example builder extension for the `world` package.
///
/// This module demonstrates how to extend `world`'s `StorageUnit` and `Gate` assemblies:
/// - withdraw an item from a player's `StorageUnit` (with owner auth)
/// - check it against your rule (see the YOUR RULE block below)
/// - deposit it into the owner's `StorageUnit`
/// - issue a `world::gate::JumpPermit` so the player can use the gate
module smart_gate_extension::corpse_gate_bounty;

use smart_gate_extension::config::{Self, AdminCap, XAuth, ExtensionConfig};
use sui::clock::Clock;
use world::{
    access::OwnerCap,
    character::Character,
    gate::{Self, Gate},
    inventory::Item,
    storage_unit::StorageUnit
};

// === Errors ===
#[error(code = 0)]
const ECorpseTypeIdEmpty: vector<u8> = b"Corpse type id is empty";
#[error(code = 1)]
const ECorpseTypeMismatch: vector<u8> = b"Corpse type id mismatch";
#[error(code = 2)]
const ENoBountyConfig: vector<u8> = b"Missing BountyConfig on ExtensionConfig";
#[error(code = 3)]
const EExpiryOverflow: vector<u8> = b"Expiry timestamp overflow";

/// Stored as a dynamic field value under `ExtensionConfig`.
public struct BountyConfig has drop, store {
    bounty_type_id: u64,
    expiry_duration_ms: u64,
}

/// Dynamic-field key for `BountyConfig`.
public struct BountyConfigKey has copy, drop, store {}

// ╔═════════════════════════════ YOUR RULE ═════════════════════════════╗
// Decides whether `character` may jump, given the `item` they handed in.
// Abort with one of your own errors to deny the jump; return to allow it.
//
// Edit only between the YOUR RULE markers. Available inputs:
//   bounty_cfg.bounty_type_id   the item type set by `pnpm setup-gate`
//   item.type_id(), item.quantity()
//   character.tribe(), character.key().item_id()  (the character item ID)
//   clock.timestamp_ms()
// Number your own errors from 100 up so they never collide with the ones above.

#[error(code = 100)]
const ENotEnoughCorpses: vector<u8> = b"Hand in 3 corpses to pass";

const MIN_CORPSES: u32 = 3;

fun check_rule(bounty_cfg: &BountyConfig, item: &Item, _character: &Character, _clock: &Clock) {
    assert!(item.type_id() == bounty_cfg.bounty_type_id, ECorpseTypeMismatch);
    assert!(item.quantity() >= MIN_CORPSES, ENotEnoughCorpses);
}

// ╚═════════════════════════════ END RULE ══════════════════════════════╝

/// Submit a corpse to get a `JumpPermit` for using the gate.
public fun collect_corpse_bounty<T: key>(
    extension_config: &ExtensionConfig,
    storage_unit: &mut StorageUnit,
    source_gate: &Gate,
    destination_gate: &Gate,
    character: &Character,
    player_inventory_owner_cap: &OwnerCap<T>,
    corpse_type_id: u64,
    quantity: u32,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    assert!(extension_config.has_rule<BountyConfigKey>(BountyConfigKey {}), ENoBountyConfig);
    let bounty_cfg = extension_config.borrow_rule<
        BountyConfigKey,
        BountyConfig,
    >(BountyConfigKey {});

    // Withdraw the corpse from the player's inventory (owner-authorized).
    let corpse = storage_unit.withdraw_by_owner<T>(
        character,
        player_inventory_owner_cap,
        corpse_type_id,
        quantity,
        ctx,
    );

    check_rule(bounty_cfg, &corpse, character, clock);

    storage_unit.deposit_item<XAuth>(
        character,
        corpse,
        config::x_auth(),
        ctx,
    );

    let expiry_ms = bounty_cfg.expiry_duration_ms;
    let ts = clock.timestamp_ms();
    assert!(ts <= (0xFFFFFFFFFFFFFFFFu64 - expiry_ms), EExpiryOverflow);
    let expires_at_timestamp_ms = ts + expiry_ms;
    gate::issue_jump_permit<XAuth>(
        source_gate,
        destination_gate,
        character,
        config::x_auth(),
        expires_at_timestamp_ms,
        ctx,
    );
}

// === View Functions ===
public fun bounty_type_id(extension_config: &ExtensionConfig): u64 {
    extension_config.borrow_rule<BountyConfigKey, BountyConfig>(BountyConfigKey {}).bounty_type_id
}

public fun bounty_expiry_duration_ms(extension_config: &ExtensionConfig): u64 {
    extension_config
        .borrow_rule<BountyConfigKey, BountyConfig>(BountyConfigKey {})
        .expiry_duration_ms
}

// === Admin Functions ===
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
