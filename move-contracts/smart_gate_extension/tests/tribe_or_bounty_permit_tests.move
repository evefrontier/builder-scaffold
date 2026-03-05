#[test_only]
module smart_gate_extension::tribe_or_bounty_permit_tests;

use smart_gate_extension::{config::{Self, AdminCap, ExtensionConfig}, tribe_or_bounty_permit};
use std::string::utf8;
use sui::{clock, test_scenario as ts};
use world::{
    access::{AdminACL, OwnerCap},
    character::{Self, Character},
    energy::EnergyConfig,
    gate::{Self, Gate, GateConfig, JumpPermit},
    network_node::{Self, NetworkNode},
    object_registry::ObjectRegistry,
    storage_unit::{Self, StorageUnit},
    test_helpers::{Self, admin, governor, tenant, user_a, user_b}
};

// Gate / NWN constants
const GATE_TYPE_ID: u64 = 8888;
const GATE_ITEM_ID_1: u64 = 7001;
const GATE_ITEM_ID_2: u64 = 7002;
const NWN_TYPE_ID: u64 = 111000;
const NWN_ITEM_ID: u64 = 5000;
const FUEL_MAX_CAPACITY: u64 = 1000;
const FUEL_BURN_RATE_IN_MS: u64 = 3_600_000;
const MAX_PRODUCTION: u64 = 500;
const FUEL_TYPE_ID: u64 = 1;
const FUEL_VOLUME: u64 = 50;

// Storage unit constants (for bounty tests)
const STORAGE_TYPE_ID: u64 = 5555;
const STORAGE_ITEM_ID: u64 = 90002;
const MAX_CAPACITY: u64 = 100_000;

// Character item IDs (must be unique across all tests)
const CHAR_ITEM_OWNER: u32 = 5001;
const CHAR_ITEM_JUMPER: u32 = 5002;

// Rule values
const ALLOWED_TRIBE: u32 = 100;
const WRONG_TRIBE: u32 = 99;
const BOUNTY_TYPE_ID: u64 = 9999;
const BOUNTY_ITEM_ID: u64 = 1_000_004_145_108;
const BOUNTY_VOLUME: u64 = 10;
const EXPIRY_MS: u64 = 10_000;

// ── Helpers ──────────────────────────────────────────────────────────────────

fun setup_world(ts: &mut ts::Scenario) {
    test_helpers::setup_world(ts);
    test_helpers::configure_fuel(ts);
    test_helpers::configure_assembly_energy(ts);
    test_helpers::register_server_address(ts);

    ts::next_tx(ts, governor());
    gate::init_for_testing(ts.ctx());

    ts::next_tx(ts, admin());
    {
        let admin_acl = ts::take_shared<AdminACL>(ts);
        let mut gate_config = ts::take_shared<GateConfig>(ts);
        gate::set_max_distance(&mut gate_config, &admin_acl, GATE_TYPE_ID, 1_000_000_000, ts.ctx());
        ts::return_shared(gate_config);
        ts::return_shared(admin_acl);
    };

    ts::next_tx(ts, admin());
    config::init_for_testing(ts.ctx());
}

fun create_character(ts: &mut ts::Scenario, user: address, item_id: u32, tribe: u32): ID {
    ts::next_tx(ts, admin());
    let admin_acl = ts::take_shared<AdminACL>(ts);
    let mut registry = ts::take_shared<ObjectRegistry>(ts);
    let ch = character::create_character(
        &mut registry,
        &admin_acl,
        item_id,
        tenant(),
        tribe,
        user,
        utf8(b"name"),
        ts.ctx(),
    );
    let id = object::id(&ch);
    ch.share_character(&admin_acl, ts.ctx());
    ts::return_shared(registry);
    ts::return_shared(admin_acl);
    id
}

fun create_nwn(ts: &mut ts::Scenario, character_id: ID): ID {
    ts::next_tx(ts, admin());
    let mut registry = ts::take_shared<ObjectRegistry>(ts);
    let character = ts::take_shared_by_id<Character>(ts, character_id);
    let admin_acl = ts::take_shared<AdminACL>(ts);
    let nwn = network_node::anchor(
        &mut registry,
        &character,
        &admin_acl,
        NWN_ITEM_ID,
        NWN_TYPE_ID,
        test_helpers::get_verified_location_hash(),
        FUEL_MAX_CAPACITY,
        FUEL_BURN_RATE_IN_MS,
        MAX_PRODUCTION,
        ts.ctx(),
    );
    let id = object::id(&nwn);
    nwn.share_network_node(&admin_acl, ts.ctx());
    ts::return_shared(character);
    ts::return_shared(registry);
    ts::return_shared(admin_acl);
    id
}

fun create_gate(ts: &mut ts::Scenario, character_id: ID, nwn_id: ID, item_id: u64): ID {
    ts::next_tx(ts, admin());
    let mut registry = ts::take_shared<ObjectRegistry>(ts);
    let mut nwn = ts::take_shared_by_id<NetworkNode>(ts, nwn_id);
    let character = ts::take_shared_by_id<Character>(ts, character_id);
    let admin_acl = ts::take_shared<AdminACL>(ts);
    let gate_obj = gate::anchor(
        &mut registry,
        &mut nwn,
        &character,
        &admin_acl,
        item_id,
        GATE_TYPE_ID,
        test_helpers::get_verified_location_hash(),
        ts.ctx(),
    );
    let id = object::id(&gate_obj);
    gate_obj.share_gate(&admin_acl, ts.ctx());
    ts::return_shared(character);
    ts::return_shared(nwn);
    ts::return_shared(registry);
    ts::return_shared(admin_acl);
    id
}

fun bring_nwn_online(ts: &mut ts::Scenario, character_id: ID, nwn_id: ID) {
    ts::next_tx(ts, user_a());
    let clock = clock::create_for_testing(ts.ctx());
    let mut nwn = ts::take_shared_by_id<NetworkNode>(ts, nwn_id);
    let mut character = ts::take_shared_by_id<Character>(ts, character_id);
    let (owner_cap, receipt) = character.borrow_owner_cap<NetworkNode>(
        ts::receiving_ticket_by_id<OwnerCap<NetworkNode>>(nwn.owner_cap_id()),
        ts.ctx(),
    );
    nwn.deposit_fuel_test(&owner_cap, FUEL_TYPE_ID, FUEL_VOLUME, 10, &clock);
    nwn.online(&owner_cap, &clock);
    character.return_owner_cap(owner_cap, receipt);
    ts::return_shared(nwn);
    ts::return_shared(character);
    clock.destroy_for_testing();
}

fun link_and_online_gates(
    ts: &mut ts::Scenario,
    character_id: ID,
    nwn_id: ID,
    gate_a_id: ID,
    gate_b_id: ID,
) {
    use std::bcs;
    ts::next_tx(ts, user_a());
    let mut nwn = ts::take_shared_by_id<NetworkNode>(ts, nwn_id);
    let energy_config = ts::take_shared<EnergyConfig>(ts);
    let gate_config = ts::take_shared<GateConfig>(ts);
    let server_registry = ts::take_shared<world::access::ServerAddressRegistry>(ts);
    let admin_acl = ts::take_shared<AdminACL>(ts);
    let mut gate_a = ts::take_shared_by_id<Gate>(ts, gate_a_id);
    let mut gate_b = ts::take_shared_by_id<Gate>(ts, gate_b_id);
    let mut character = ts::take_shared_by_id<Character>(ts, character_id);
    let (owner_cap_a, receipt_a) = character.borrow_owner_cap<Gate>(
        ts::receiving_ticket_by_id<OwnerCap<Gate>>(gate_a.owner_cap_id()),
        ts.ctx(),
    );
    let (owner_cap_b, receipt_b) = character.borrow_owner_cap<Gate>(
        ts::receiving_ticket_by_id<OwnerCap<Gate>>(gate_b.owner_cap_id()),
        ts.ctx(),
    );
    let proof_bytes = bcs::to_bytes(
        &test_helpers::construct_location_proof(test_helpers::get_verified_location_hash()),
    );
    let clock = clock::create_for_testing(ts.ctx());
    gate_a.link_gates(
        &mut gate_b,
        &gate_config,
        &server_registry,
        &admin_acl,
        &owner_cap_a,
        &owner_cap_b,
        proof_bytes,
        &clock,
        ts.ctx(),
    );
    gate_a.online(&mut nwn, &energy_config, &owner_cap_a);
    gate_b.online(&mut nwn, &energy_config, &owner_cap_b);
    clock.destroy_for_testing();
    character.return_owner_cap(owner_cap_a, receipt_a);
    character.return_owner_cap(owner_cap_b, receipt_b);
    ts::return_shared(character);
    ts::return_shared(gate_a);
    ts::return_shared(gate_b);
    ts::return_shared(nwn);
    ts::return_shared(energy_config);
    ts::return_shared(gate_config);
    ts::return_shared(server_registry);
    ts::return_shared(admin_acl);
}

fun authorize_xauth_on_gate(ts: &mut ts::Scenario, character_id: ID, gate_id: ID) {
    ts::next_tx(ts, user_a());
    let mut gate_obj = ts::take_shared_by_id<Gate>(ts, gate_id);
    let mut character = ts::take_shared_by_id<Character>(ts, character_id);
    let (owner_cap, receipt) = character.borrow_owner_cap<Gate>(
        ts::receiving_ticket_by_id<OwnerCap<Gate>>(gate_obj.owner_cap_id()),
        ts.ctx(),
    );
    gate_obj.authorize_extension<smart_gate_extension::config::XAuth>(&owner_cap);
    character.return_owner_cap(owner_cap, receipt);
    ts::return_shared(character);
    ts::return_shared(gate_obj);
}

fun authorize_xauth_on_storage_unit(ts: &mut ts::Scenario, character_id: ID, storage_id: ID) {
    ts::next_tx(ts, user_a());
    let mut su = ts::take_shared_by_id<StorageUnit>(ts, storage_id);
    let mut character = ts::take_shared_by_id<Character>(ts, character_id);
    let cap_id = su.owner_cap_id();
    let (owner_cap, receipt) = character.borrow_owner_cap<StorageUnit>(
        ts::receiving_ticket_by_id<OwnerCap<StorageUnit>>(cap_id),
        ts.ctx(),
    );
    su.authorize_extension<smart_gate_extension::config::XAuth>(&owner_cap);
    character.return_owner_cap(owner_cap, receipt);
    ts::return_shared(character);
    ts::return_shared(su);
}

fun create_storage_unit(ts: &mut ts::Scenario, character_id: ID, nwn_id: ID): ID {
    ts::next_tx(ts, admin());
    let admin_acl = ts::take_shared<AdminACL>(ts);
    let mut registry = ts::take_shared<ObjectRegistry>(ts);
    let mut nwn = ts::take_shared_by_id<NetworkNode>(ts, nwn_id);
    let character = ts::take_shared_by_id<Character>(ts, character_id);
    let su = storage_unit::anchor(
        &mut registry,
        &mut nwn,
        &character,
        &admin_acl,
        STORAGE_ITEM_ID,
        STORAGE_TYPE_ID,
        MAX_CAPACITY,
        test_helpers::get_verified_location_hash(),
        ts.ctx(),
    );
    let id = object::id(&su);
    su.share_storage_unit(&admin_acl, ts.ctx());
    ts::return_shared(character);
    ts::return_shared(registry);
    ts::return_shared(nwn);
    ts::return_shared(admin_acl);
    id
}

fun online_storage_unit(ts: &mut ts::Scenario, character_id: ID, storage_id: ID, nwn_id: ID) {
    ts::next_tx(ts, user_a());
    let energy_config = ts::take_shared<EnergyConfig>(ts);
    let mut storage_unit = ts::take_shared_by_id<StorageUnit>(ts, storage_id);
    let mut nwn = ts::take_shared_by_id<NetworkNode>(ts, nwn_id);
    let mut character = ts::take_shared_by_id<Character>(ts, character_id);
    let (owner_cap, receipt) = character.borrow_owner_cap<StorageUnit>(
        ts::receiving_ticket_by_id<OwnerCap<StorageUnit>>(storage_unit.owner_cap_id()),
        ts.ctx(),
    );
    storage_unit.online(&mut nwn, &energy_config, &owner_cap);
    character.return_owner_cap(owner_cap, receipt);
    ts::return_shared(character);
    ts::return_shared(storage_unit);
    ts::return_shared(nwn);
    ts::return_shared(energy_config);
}

fun seed_items_to_character(
    ts: &mut ts::Scenario,
    user: address,
    character_id: ID,
    storage_id: ID,
) {
    ts::next_tx(ts, user);
    let mut character = ts::take_shared_by_id<Character>(ts, character_id);
    let cap_id = character.owner_cap_id();
    let (owner_cap, receipt) = character.borrow_owner_cap<Character>(
        ts::receiving_ticket_by_id<OwnerCap<Character>>(cap_id),
        ts.ctx(),
    );
    let mut su = ts::take_shared_by_id<StorageUnit>(ts, storage_id);
    su.game_item_to_chain_inventory_test<Character>(
        &character,
        &owner_cap,
        BOUNTY_ITEM_ID,
        BOUNTY_TYPE_ID,
        BOUNTY_VOLUME,
        1,
        ts.ctx(),
    );
    character.return_owner_cap(owner_cap, receipt);
    ts::return_shared(character);
    ts::return_shared(su);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

/// Tribe member with correct tribe jumps for free.
#[test]
fun test_tribe_permit_succeeds() {
    let mut ts = ts::begin(governor());
    setup_world(&mut ts);

    let owner_id = create_character(&mut ts, user_a(), CHAR_ITEM_OWNER, ALLOWED_TRIBE);
    let nwn_id = create_nwn(&mut ts, owner_id);
    let gate_a_id = create_gate(&mut ts, owner_id, nwn_id, GATE_ITEM_ID_1);
    let gate_b_id = create_gate(&mut ts, owner_id, nwn_id, GATE_ITEM_ID_2);
    bring_nwn_online(&mut ts, owner_id, nwn_id);
    link_and_online_gates(&mut ts, owner_id, nwn_id, gate_a_id, gate_b_id);
    authorize_xauth_on_gate(&mut ts, owner_id, gate_a_id);
    authorize_xauth_on_gate(&mut ts, owner_id, gate_b_id);

    // Set tribe config
    ts::next_tx(&mut ts, admin());
    {
        let mut ext_cfg = ts::take_shared<ExtensionConfig>(&ts);
        let admin_cap = ts::take_from_sender<AdminCap>(&ts);
        tribe_or_bounty_permit::set_tribe_config(
            &mut ext_cfg,
            &admin_cap,
            ALLOWED_TRIBE,
            EXPIRY_MS,
        );
        ts::return_shared(ext_cfg);
        ts::return_to_sender(&ts, admin_cap);
    };

    // Issue permit via tribe path
    ts::next_tx(&mut ts, user_a());
    {
        let ext_cfg = ts::take_shared<ExtensionConfig>(&ts);
        let gate_a = ts::take_shared_by_id<Gate>(&ts, gate_a_id);
        let gate_b = ts::take_shared_by_id<Gate>(&ts, gate_b_id);
        let character = ts::take_shared_by_id<Character>(&ts, owner_id);
        let clock = clock::create_for_testing(ts.ctx());
        tribe_or_bounty_permit::issue_via_tribe(
            &ext_cfg,
            &gate_a,
            &gate_b,
            &character,
            &clock,
            ts.ctx(),
        );
        clock.destroy_for_testing();
        ts::return_shared(ext_cfg);
        ts::return_shared(gate_a);
        ts::return_shared(gate_b);
        ts::return_shared(character);
    };

    // Consume the permit
    ts::next_tx(&mut ts, user_a());
    {
        let permit = ts::take_from_sender<JumpPermit>(&ts);
        let gate_a = ts::take_shared_by_id<Gate>(&ts, gate_a_id);
        let gate_b = ts::take_shared_by_id<Gate>(&ts, gate_b_id);
        let character = ts::take_shared_by_id<Character>(&ts, owner_id);
        let clock = clock::create_for_testing(ts.ctx());
        gate::test_jump_with_permit(&gate_a, &gate_b, &character, permit, &clock);
        clock.destroy_for_testing();
        ts::return_shared(gate_a);
        ts::return_shared(gate_b);
        ts::return_shared(character);
    };

    ts::end(ts);
}

/// Character with wrong tribe is rejected on the tribe path.
#[test]
#[expected_failure(abort_code = tribe_or_bounty_permit::ENotPermittedTribe)]
fun test_tribe_permit_fails_wrong_tribe() {
    let mut ts = ts::begin(governor());
    setup_world(&mut ts);

    let owner_id = create_character(&mut ts, user_a(), CHAR_ITEM_OWNER, WRONG_TRIBE);
    let nwn_id = create_nwn(&mut ts, owner_id);
    let gate_a_id = create_gate(&mut ts, owner_id, nwn_id, GATE_ITEM_ID_1);
    let gate_b_id = create_gate(&mut ts, owner_id, nwn_id, GATE_ITEM_ID_2);
    bring_nwn_online(&mut ts, owner_id, nwn_id);
    link_and_online_gates(&mut ts, owner_id, nwn_id, gate_a_id, gate_b_id);
    authorize_xauth_on_gate(&mut ts, owner_id, gate_a_id);
    authorize_xauth_on_gate(&mut ts, owner_id, gate_b_id);

    ts::next_tx(&mut ts, admin());
    {
        let mut ext_cfg = ts::take_shared<ExtensionConfig>(&ts);
        let admin_cap = ts::take_from_sender<AdminCap>(&ts);
        tribe_or_bounty_permit::set_tribe_config(
            &mut ext_cfg,
            &admin_cap,
            ALLOWED_TRIBE,
            EXPIRY_MS,
        );
        ts::return_shared(ext_cfg);
        ts::return_to_sender(&ts, admin_cap);
    };

    ts::next_tx(&mut ts, user_a());
    {
        let ext_cfg = ts::take_shared<ExtensionConfig>(&ts);
        let gate_a = ts::take_shared_by_id<Gate>(&ts, gate_a_id);
        let gate_b = ts::take_shared_by_id<Gate>(&ts, gate_b_id);
        let character = ts::take_shared_by_id<Character>(&ts, owner_id); // tribe = WRONG_TRIBE
        let clock = clock::create_for_testing(ts.ctx());
        tribe_or_bounty_permit::issue_via_tribe(
            &ext_cfg,
            &gate_a,
            &gate_b,
            &character,
            &clock,
            ts.ctx(),
        );
        clock.destroy_for_testing();
        ts::return_shared(ext_cfg);
        ts::return_shared(gate_a);
        ts::return_shared(gate_b);
        ts::return_shared(character);
    };

    ts::end(ts);
}

/// Calling tribe path without a TribeConfig set aborts.
#[test]
#[expected_failure(abort_code = tribe_or_bounty_permit::ENoTribeConfig)]
fun test_tribe_permit_fails_no_config() {
    let mut ts = ts::begin(governor());
    setup_world(&mut ts);

    let owner_id = create_character(&mut ts, user_a(), CHAR_ITEM_OWNER, ALLOWED_TRIBE);
    let nwn_id = create_nwn(&mut ts, owner_id);
    let gate_a_id = create_gate(&mut ts, owner_id, nwn_id, GATE_ITEM_ID_1);
    let gate_b_id = create_gate(&mut ts, owner_id, nwn_id, GATE_ITEM_ID_2);
    bring_nwn_online(&mut ts, owner_id, nwn_id);
    link_and_online_gates(&mut ts, owner_id, nwn_id, gate_a_id, gate_b_id);
    authorize_xauth_on_gate(&mut ts, owner_id, gate_a_id);
    authorize_xauth_on_gate(&mut ts, owner_id, gate_b_id);

    // No set_tribe_config call
    ts::next_tx(&mut ts, user_a());
    {
        let ext_cfg = ts::take_shared<ExtensionConfig>(&ts);
        let gate_a = ts::take_shared_by_id<Gate>(&ts, gate_a_id);
        let gate_b = ts::take_shared_by_id<Gate>(&ts, gate_b_id);
        let character = ts::take_shared_by_id<Character>(&ts, owner_id);
        let clock = clock::create_for_testing(ts.ctx());
        tribe_or_bounty_permit::issue_via_tribe(
            &ext_cfg,
            &gate_a,
            &gate_b,
            &character,
            &clock,
            ts.ctx(),
        );
        clock.destroy_for_testing();
        ts::return_shared(ext_cfg);
        ts::return_shared(gate_a);
        ts::return_shared(gate_b);
        ts::return_shared(character);
    };

    ts::end(ts);
}

/// Any character can jump by paying a corpse bounty regardless of tribe.
#[test]
fun test_bounty_permit_succeeds() {
    let mut ts = ts::begin(governor());
    setup_world(&mut ts);

    // owner (user_a) sets up NWN, storage unit, and gates
    let owner_id = create_character(&mut ts, user_a(), CHAR_ITEM_OWNER, ALLOWED_TRIBE);
    let nwn_id = create_nwn(&mut ts, owner_id);
    let gate_a_id = create_gate(&mut ts, owner_id, nwn_id, GATE_ITEM_ID_1);
    let gate_b_id = create_gate(&mut ts, owner_id, nwn_id, GATE_ITEM_ID_2);
    let storage_id = create_storage_unit(&mut ts, owner_id, nwn_id);
    bring_nwn_online(&mut ts, owner_id, nwn_id);
    link_and_online_gates(&mut ts, owner_id, nwn_id, gate_a_id, gate_b_id);
    online_storage_unit(&mut ts, owner_id, storage_id, nwn_id);
    authorize_xauth_on_gate(&mut ts, owner_id, gate_a_id);
    authorize_xauth_on_gate(&mut ts, owner_id, gate_b_id);
    authorize_xauth_on_storage_unit(&mut ts, owner_id, storage_id);

    // jumper (user_b) has a different tribe but holds a bounty item
    let jumper_id = create_character(&mut ts, user_b(), CHAR_ITEM_JUMPER, WRONG_TRIBE);
    seed_items_to_character(&mut ts, user_b(), jumper_id, storage_id);

    // Set bounty config
    ts::next_tx(&mut ts, admin());
    {
        let mut ext_cfg = ts::take_shared<ExtensionConfig>(&ts);
        let admin_cap = ts::take_from_sender<AdminCap>(&ts);
        tribe_or_bounty_permit::set_bounty_config(
            &mut ext_cfg,
            &admin_cap,
            BOUNTY_TYPE_ID,
            EXPIRY_MS,
        );
        ts::return_shared(ext_cfg);
        ts::return_to_sender(&ts, admin_cap);
    };

    // user_b pays bounty and receives a JumpPermit
    ts::next_tx(&mut ts, user_b());
    {
        let ext_cfg = ts::take_shared<ExtensionConfig>(&ts);
        let mut su = ts::take_shared_by_id<StorageUnit>(&ts, storage_id);
        let gate_a = ts::take_shared_by_id<Gate>(&ts, gate_a_id);
        let gate_b = ts::take_shared_by_id<Gate>(&ts, gate_b_id);
        let mut jumper = ts::take_shared_by_id<Character>(&ts, jumper_id);
        let clock = clock::create_for_testing(ts.ctx());
        let cap_id = jumper.owner_cap_id();
        let (owner_cap, receipt) = jumper.borrow_owner_cap<Character>(
            ts::receiving_ticket_by_id<OwnerCap<Character>>(cap_id),
            ts.ctx(),
        );
        tribe_or_bounty_permit::issue_via_bounty<Character>(
            &ext_cfg,
            &mut su,
            &gate_a,
            &gate_b,
            &jumper,
            &owner_cap,
            &clock,
            ts.ctx(),
        );
        jumper.return_owner_cap(owner_cap, receipt);
        clock.destroy_for_testing();
        ts::return_shared(ext_cfg);
        ts::return_shared(su);
        ts::return_shared(gate_a);
        ts::return_shared(gate_b);
        ts::return_shared(jumper);
    };

    // Consume the permit
    ts::next_tx(&mut ts, user_b());
    {
        let permit = ts::take_from_sender<JumpPermit>(&ts);
        let gate_a = ts::take_shared_by_id<Gate>(&ts, gate_a_id);
        let gate_b = ts::take_shared_by_id<Gate>(&ts, gate_b_id);
        let jumper = ts::take_shared_by_id<Character>(&ts, jumper_id);
        let clock = clock::create_for_testing(ts.ctx());
        gate::test_jump_with_permit(&gate_a, &gate_b, &jumper, permit, &clock);
        clock.destroy_for_testing();
        ts::return_shared(gate_a);
        ts::return_shared(gate_b);
        ts::return_shared(jumper);
    };

    ts::end(ts);
}

/// Calling bounty path without a BountyConfig set aborts.
#[test]
#[expected_failure(abort_code = tribe_or_bounty_permit::ENoBountyConfig)]
fun test_bounty_permit_fails_no_config() {
    let mut ts = ts::begin(governor());
    setup_world(&mut ts);

    let owner_id = create_character(&mut ts, user_a(), CHAR_ITEM_OWNER, ALLOWED_TRIBE);
    let nwn_id = create_nwn(&mut ts, owner_id);
    let gate_a_id = create_gate(&mut ts, owner_id, nwn_id, GATE_ITEM_ID_1);
    let gate_b_id = create_gate(&mut ts, owner_id, nwn_id, GATE_ITEM_ID_2);
    let storage_id = create_storage_unit(&mut ts, owner_id, nwn_id);
    bring_nwn_online(&mut ts, owner_id, nwn_id);
    link_and_online_gates(&mut ts, owner_id, nwn_id, gate_a_id, gate_b_id);
    online_storage_unit(&mut ts, owner_id, storage_id, nwn_id);
    authorize_xauth_on_gate(&mut ts, owner_id, gate_a_id);
    authorize_xauth_on_gate(&mut ts, owner_id, gate_b_id);
    authorize_xauth_on_storage_unit(&mut ts, owner_id, storage_id);

    let jumper_id = create_character(&mut ts, user_b(), CHAR_ITEM_JUMPER, WRONG_TRIBE);
    seed_items_to_character(&mut ts, user_b(), jumper_id, storage_id);

    // No set_bounty_config — should abort immediately
    ts::next_tx(&mut ts, user_b());
    {
        let ext_cfg = ts::take_shared<ExtensionConfig>(&ts);
        let mut su = ts::take_shared_by_id<StorageUnit>(&ts, storage_id);
        let gate_a = ts::take_shared_by_id<Gate>(&ts, gate_a_id);
        let gate_b = ts::take_shared_by_id<Gate>(&ts, gate_b_id);
        let mut jumper = ts::take_shared_by_id<Character>(&ts, jumper_id);
        let clock = clock::create_for_testing(ts.ctx());
        let cap_id = jumper.owner_cap_id();
        let (owner_cap, receipt) = jumper.borrow_owner_cap<Character>(
            ts::receiving_ticket_by_id<OwnerCap<Character>>(cap_id),
            ts.ctx(),
        );
        tribe_or_bounty_permit::issue_via_bounty<Character>(
            &ext_cfg,
            &mut su,
            &gate_a,
            &gate_b,
            &jumper,
            &owner_cap,
            &clock,
            ts.ctx(),
        );
        jumper.return_owner_cap(owner_cap, receipt);
        clock.destroy_for_testing();
        ts::return_shared(ext_cfg);
        ts::return_shared(su);
        ts::return_shared(gate_a);
        ts::return_shared(gate_b);
        ts::return_shared(jumper);
    };

    ts::end(ts);
}

/// set_bounty_config rejects a zero type id.
#[test]
#[expected_failure(abort_code = tribe_or_bounty_permit::ECorpseTypeIdEmpty)]
fun test_bounty_config_rejects_zero_type_id() {
    let mut ts = ts::begin(governor());
    setup_world(&mut ts);

    ts::next_tx(&mut ts, admin());
    {
        let mut ext_cfg = ts::take_shared<ExtensionConfig>(&ts);
        let admin_cap = ts::take_from_sender<AdminCap>(&ts);
        tribe_or_bounty_permit::set_bounty_config(&mut ext_cfg, &admin_cap, 0, EXPIRY_MS);
        ts::return_shared(ext_cfg);
        ts::return_to_sender(&ts, admin_cap);
    };

    ts::end(ts);
}

/// View functions return the configured values after set_tribe_config / set_bounty_config.
#[test]
fun test_view_functions_return_configured_values() {
    let mut ts = ts::begin(governor());
    setup_world(&mut ts);

    ts::next_tx(&mut ts, admin());
    {
        let mut ext_cfg = ts::take_shared<ExtensionConfig>(&ts);
        let admin_cap = ts::take_from_sender<AdminCap>(&ts);
        tribe_or_bounty_permit::set_tribe_config(
            &mut ext_cfg,
            &admin_cap,
            ALLOWED_TRIBE,
            EXPIRY_MS,
        );
        tribe_or_bounty_permit::set_bounty_config(
            &mut ext_cfg,
            &admin_cap,
            BOUNTY_TYPE_ID,
            EXPIRY_MS * 2,
        );
        assert!(tribe_or_bounty_permit::tribe(&ext_cfg) == ALLOWED_TRIBE, 0);
        assert!(tribe_or_bounty_permit::tribe_expiry_duration_ms(&ext_cfg) == EXPIRY_MS, 0);
        assert!(tribe_or_bounty_permit::bounty_type_id(&ext_cfg) == BOUNTY_TYPE_ID, 0);
        assert!(tribe_or_bounty_permit::bounty_expiry_duration_ms(&ext_cfg) == EXPIRY_MS * 2, 0);
        ts::return_shared(ext_cfg);
        ts::return_to_sender(&ts, admin_cap);
    };

    ts::end(ts);
}
