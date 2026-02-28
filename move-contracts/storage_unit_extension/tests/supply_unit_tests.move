#[test_only]
module storage_unit_extension::supply_unit_tests;

use std::{string::utf8, unit_test::assert_eq};
use storage_unit_extension::supply_unit::{Self, SupplyAuth};
use sui::{clock, coin, test_scenario as ts};
use tokens::currency_token::CURRENCY_TOKEN;
use world::{
    access::{OwnerCap, AdminACL},
    character::{Self, Character},
    energy::EnergyConfig,
    network_node::{Self, NetworkNode},
    object_registry::ObjectRegistry,
    storage_unit::{Self, StorageUnit},
    test_helpers
};

const OWNER_ITEM_ID: u32 = 1000u32;
const BUYER_ITEM_ID: u32 = 5678u32;
const LOCATION_HASH: vector<u8> =
    x"7a8f3b2e9c4d1a6f5e8b2d9c3f7a1e5b7a8f3b2e9c4d1a6f5e8b2d9c3f7a1e5b";
const MAX_CAPACITY: u64 = 100000;
const STORAGE_TYPE_ID: u64 = 5555;
const STORAGE_ITEM_ID: u64 = 90002;

const LENS_TYPE_ID: u64 = 88070;
const LENS_ITEM_ID: u64 = 1000004145108;
const LENS_VOLUME: u64 = 50;
const LENS_QUANTITY: u32 = 5;

const MS_PER_SECOND: u64 = 1000;
const NWN_TYPE_ID: u64 = 111000;
const NWN_ITEM_ID: u64 = 5000;
const FUEL_MAX_CAPACITY: u64 = 1000;
const FUEL_BURN_RATE_IN_MS: u64 = 3600 * MS_PER_SECOND;
const MAX_PRODUCTION: u64 = 100;
const FUEL_TYPE_ID: u64 = 1;
const FUEL_VOLUME: u64 = 10;

const PRICE_PER_ITEM: u64 = 100;
const BUYER_COIN_AMOUNT: u64 = 1000;

fun governor(): address {
    test_helpers::governor()
}

fun admin(): address {
    test_helpers::admin()
}

fun owner(): address {
    @0xC
}

fun buyer(): address {
    @0xE
}

fun collection(): address {
    @0xF
}

fun setup_world(ts: &mut ts::Scenario) {
    test_helpers::setup_world(ts);
    test_helpers::configure_assembly_energy(ts);
    test_helpers::register_server_address(ts);
}

fun create_character(ts: &mut ts::Scenario, user: address, item_id: u32): ID {
    ts::next_tx(ts, admin());
    {
        let admin_acl = ts::take_shared<AdminACL>(ts);
        let mut registry = ts::take_shared<ObjectRegistry>(ts);
        let ch = character::create_character(
            &mut registry,
            &admin_acl,
            item_id,
            test_helpers::tenant(),
            100,
            user,
            utf8(b"name"),
            ts::ctx(ts),
        );
        let id = object::id(&ch);
        character::share_character(ch, &admin_acl, ts::ctx(ts));
        ts::return_shared(registry);
        ts::return_shared(admin_acl);
        id
    }
}

fun create_storage_unit(ts: &mut ts::Scenario, character_id: ID): (ID, ID) {
    ts::next_tx(ts, admin());
    let nwn_id = {
        let admin_acl = ts::take_shared<AdminACL>(ts);
        let mut registry = ts::take_shared<ObjectRegistry>(ts);
        let character = ts::take_shared_by_id<Character>(ts, character_id);
        let nwn = network_node::anchor(
            &mut registry,
            &character,
            &admin_acl,
            NWN_ITEM_ID,
            NWN_TYPE_ID,
            LOCATION_HASH,
            FUEL_MAX_CAPACITY,
            FUEL_BURN_RATE_IN_MS,
            MAX_PRODUCTION,
            ts::ctx(ts),
        );
        let id = object::id(&nwn);
        nwn.share_network_node(&admin_acl, ts::ctx(ts));
        ts::return_shared(character);
        ts::return_shared(admin_acl);
        ts::return_shared(registry);
        id
    };

    ts::next_tx(ts, admin());
    let storage_unit_id = {
        let admin_acl = ts::take_shared<AdminACL>(ts);
        let mut registry = ts::take_shared<ObjectRegistry>(ts);
        let mut nwn = ts::take_shared_by_id<NetworkNode>(ts, nwn_id);
        let character = ts::take_shared_by_id<Character>(ts, character_id);
        let storage_unit = storage_unit::anchor(
            &mut registry,
            &mut nwn,
            &character,
            &admin_acl,
            STORAGE_ITEM_ID,
            STORAGE_TYPE_ID,
            MAX_CAPACITY,
            LOCATION_HASH,
            ts::ctx(ts),
        );
        let id = object::id(&storage_unit);
        storage_unit.share_storage_unit(&admin_acl, ts::ctx(ts));
        ts::return_shared(character);
        ts::return_shared(registry);
        ts::return_shared(nwn);
        ts::return_shared(admin_acl);
        id
    };
    (storage_unit_id, nwn_id)
}

fun online_storage_unit(
    ts: &mut ts::Scenario,
    user: address,
    character_id: ID,
    storage_id: ID,
    nwn_id: ID,
) {
    let clock = clock::create_for_testing(ts::ctx(ts));
    ts::next_tx(ts, user);
    let mut character = ts::take_shared_by_id<Character>(ts, character_id);
    let (owner_cap, receipt) = character.borrow_owner_cap<NetworkNode>(
        ts::most_recent_receiving_ticket<OwnerCap<NetworkNode>>(&character_id),
        ts::ctx(ts),
    );
    ts::next_tx(ts, user);
    {
        let mut nwn = ts::take_shared_by_id<NetworkNode>(ts, nwn_id);
        nwn.deposit_fuel_test(&owner_cap, FUEL_TYPE_ID, FUEL_VOLUME, 10, &clock);
        ts::return_shared(nwn);
    };
    ts::next_tx(ts, user);
    {
        let mut nwn = ts::take_shared_by_id<NetworkNode>(ts, nwn_id);
        nwn.online(&owner_cap, &clock);
        ts::return_shared(nwn);
    };
    character.return_owner_cap(owner_cap, receipt);

    ts::next_tx(ts, user);
    {
        let mut storage_unit = ts::take_shared_by_id<StorageUnit>(ts, storage_id);
        let mut nwn = ts::take_shared_by_id<NetworkNode>(ts, nwn_id);
        let energy_config = ts::take_shared<EnergyConfig>(ts);
        let (owner_cap, receipt) = character.borrow_owner_cap<StorageUnit>(
            ts::most_recent_receiving_ticket<OwnerCap<StorageUnit>>(&character_id),
            ts::ctx(ts),
        );
        storage_unit.online(&mut nwn, &energy_config, &owner_cap);
        character.return_owner_cap(owner_cap, receipt);
        ts::return_shared(storage_unit);
        ts::return_shared(nwn);
        ts::return_shared(energy_config);
    };

    ts::return_shared(character);
    clock.destroy_for_testing();
}

/// Helper: owner creates supply unit config, authorizes SupplyAuth on storage unit.
fun create_and_authorize_supply_unit(ts: &mut ts::Scenario, owner_id: ID, storage_id: ID) {
    ts::next_tx(ts, owner());
    {
        let mut character = ts::take_shared_by_id<Character>(ts, owner_id);
        let (owner_cap, receipt) = character.borrow_owner_cap<StorageUnit>(
            ts::most_recent_receiving_ticket<OwnerCap<StorageUnit>>(&owner_id),
            ts::ctx(ts),
        );
        let mut storage_unit = ts::take_shared_by_id<StorageUnit>(ts, storage_id);
        supply_unit::create_supply_unit(
            &storage_unit,
            &owner_cap,
            collection(),
            PRICE_PER_ITEM,
            LENS_TYPE_ID,
            ts::ctx(ts),
        );
        storage_unit.authorize_extension<SupplyAuth>(&owner_cap);
        character.return_owner_cap(owner_cap, receipt);
        ts::return_shared(character);
        ts::return_shared(storage_unit);
    };
}

/// Helper: mint items into a character's ephemeral inventory on the storage unit.
fun mint_items_to_ephemeral(
    ts: &mut ts::Scenario,
    user: address,
    character_id: ID,
    storage_id: ID,
    item_id: u64,
    type_id: u64,
    volume: u64,
    quantity: u32,
) {
    ts::next_tx(ts, user);
    {
        let mut character = ts::take_shared_by_id<Character>(ts, character_id);
        let (owner_cap, receipt) = character.borrow_owner_cap<Character>(
            ts::most_recent_receiving_ticket<OwnerCap<Character>>(&character_id),
            ts::ctx(ts),
        );
        let mut storage_unit = ts::take_shared_by_id<StorageUnit>(ts, storage_id);
        storage_unit.game_item_to_chain_inventory_test<Character>(
            &character,
            &owner_cap,
            item_id,
            type_id,
            volume,
            quantity,
            ts::ctx(ts),
        );
        character.return_owner_cap(owner_cap, receipt);
        ts::return_shared(character);
        ts::return_shared(storage_unit);
    };
}

/// Helper: owner withdraws from ephemeral and stocks supply unit.
fun stock_items(
    ts: &mut ts::Scenario,
    user: address,
    character_id: ID,
    storage_id: ID,
    type_id: u64,
    quantity: u32,
) {
    ts::next_tx(ts, user);
    {
        let mut character = ts::take_shared_by_id<Character>(ts, character_id);
        let (owner_cap, receipt) = character.borrow_owner_cap<Character>(
            ts::most_recent_receiving_ticket<OwnerCap<Character>>(&character_id),
            ts::ctx(ts),
        );
        let mut storage_unit = ts::take_shared_by_id<StorageUnit>(ts, storage_id);
        let supply_unit_obj = ts::take_shared<supply_unit::SupplyUnit>(ts);

        let item = storage_unit::withdraw_by_owner(
            &mut storage_unit,
            &character,
            &owner_cap,
            type_id,
            quantity,
            ts::ctx(ts),
        );
        supply_unit::stock_supply_unit(
            &supply_unit_obj,
            &mut storage_unit,
            &character,
            item,
            ts::ctx(ts),
        );

        character.return_owner_cap(owner_cap, receipt);
        ts::return_shared(character);
        ts::return_shared(storage_unit);
        ts::return_shared(supply_unit_obj);
    };
}

/// Owner creates supply unit and authorizes SupplyAuth.
#[test]
fun test_supply_unit_create() {
    let mut ts = ts::begin(governor());
    setup_world(&mut ts);

    let owner_id = create_character(&mut ts, owner(), OWNER_ITEM_ID);

    let (storage_id, nwn_id) = create_storage_unit(&mut ts, owner_id);
    online_storage_unit(&mut ts, owner(), owner_id, storage_id, nwn_id);
    create_and_authorize_supply_unit(&mut ts, owner_id, storage_id);

    ts::end(ts);
}

/// Owner stocks supply unit with items from ephemeral.
/// Asserts items move from ephemeral to main storage.
#[test]
fun test_supply_unit_stock() {
    let mut ts = ts::begin(governor());
    setup_world(&mut ts);

    let owner_id = create_character(&mut ts, owner(), OWNER_ITEM_ID);
    let (storage_id, nwn_id) = create_storage_unit(&mut ts, owner_id);
    online_storage_unit(&mut ts, owner(), owner_id, storage_id, nwn_id);
    create_and_authorize_supply_unit(&mut ts, owner_id, storage_id);

    mint_items_to_ephemeral(
        &mut ts,
        owner(),
        owner_id,
        storage_id,
        LENS_ITEM_ID,
        LENS_TYPE_ID,
        LENS_VOLUME,
        LENS_QUANTITY,
    );

    stock_items(&mut ts, owner(), owner_id, storage_id, LENS_TYPE_ID, LENS_QUANTITY);

    // Assert: items in main, not in owner ephemeral
    let storage_owner_cap_id = {
        ts::next_tx(&mut ts, admin());
        let su = ts::take_shared_by_id<StorageUnit>(&ts, storage_id);
        let id = su.owner_cap_id();
        ts::return_shared(su);
        id
    };
    let owner_cap_id = {
        ts::next_tx(&mut ts, admin());
        let c = ts::take_shared_by_id<Character>(&ts, owner_id);
        let id = c.owner_cap_id();
        ts::return_shared(c);
        id
    };
    ts::next_tx(&mut ts, admin());
    {
        let su = ts::take_shared_by_id<StorageUnit>(&ts, storage_id);
        assert_eq!(su.item_quantity(storage_owner_cap_id, LENS_TYPE_ID), LENS_QUANTITY);
        assert!(!su.contains_item(owner_cap_id, LENS_TYPE_ID));
        ts::return_shared(su);
    };

    ts::end(ts);
}

/// Full flow: create, stock, buyer orders items with CURRENCY_TOKEN.
/// Asserts: items in buyer ephemeral, payment at collection address,
/// remainder returned to buyer.
#[test]
fun test_supply_unit_order() {
    let mut ts = ts::begin(governor());
    setup_world(&mut ts);

    let owner_id = create_character(&mut ts, owner(), OWNER_ITEM_ID);
    let buyer_id = create_character(&mut ts, buyer(), BUYER_ITEM_ID);
    let (storage_id, nwn_id) = create_storage_unit(&mut ts, owner_id);
    online_storage_unit(&mut ts, owner(), owner_id, storage_id, nwn_id);
    create_and_authorize_supply_unit(&mut ts, owner_id, storage_id);

    mint_items_to_ephemeral(
        &mut ts,
        owner(),
        owner_id,
        storage_id,
        LENS_ITEM_ID,
        LENS_TYPE_ID,
        LENS_VOLUME,
        LENS_QUANTITY,
    );
    stock_items(&mut ts, owner(), owner_id, storage_id, LENS_TYPE_ID, LENS_QUANTITY);

    // Buyer orders items
    ts::next_tx(&mut ts, buyer());
    {
        let buyer_char = ts::take_shared_by_id<Character>(&ts, buyer_id);
        let mut storage_unit = ts::take_shared_by_id<StorageUnit>(&ts, storage_id);
        let supply_unit_obj = ts::take_shared<supply_unit::SupplyUnit>(&ts);

        let payment = coin::mint_for_testing<CURRENCY_TOKEN>(BUYER_COIN_AMOUNT, ts::ctx(&mut ts));
        supply_unit::order_items(
            &supply_unit_obj,
            &mut storage_unit,
            &buyer_char,
            payment,
            LENS_QUANTITY,
            ts::ctx(&mut ts),
        );

        ts::return_shared(buyer_char);
        ts::return_shared(storage_unit);
        ts::return_shared(supply_unit_obj);
    };

    // Resolve cap IDs for assertions
    let storage_owner_cap_id = {
        ts::next_tx(&mut ts, admin());
        let su = ts::take_shared_by_id<StorageUnit>(&ts, storage_id);
        let id = su.owner_cap_id();
        ts::return_shared(su);
        id
    };
    let buyer_owner_cap_id = {
        ts::next_tx(&mut ts, admin());
        let c = ts::take_shared_by_id<Character>(&ts, buyer_id);
        let id = c.owner_cap_id();
        ts::return_shared(c);
        id
    };

    // Items: buyer ephemeral has Lens, main is empty
    ts::next_tx(&mut ts, admin());
    {
        let su = ts::take_shared_by_id<StorageUnit>(&ts, storage_id);
        assert_eq!(su.item_quantity(buyer_owner_cap_id, LENS_TYPE_ID), LENS_QUANTITY);
        assert!(!su.contains_item(storage_owner_cap_id, LENS_TYPE_ID));
        ts::return_shared(su);
    };

    // Payment: exact amount at collection address
    let expected_cost = PRICE_PER_ITEM * (LENS_QUANTITY as u64);
    ts::next_tx(&mut ts, collection());
    {
        let payment_coin = ts::take_from_address<coin::Coin<CURRENCY_TOKEN>>(&ts, collection());
        assert_eq!(coin::value(&payment_coin), expected_cost);
        ts::return_to_address(collection(), payment_coin);
    };

    // Remainder: returned to buyer
    ts::next_tx(&mut ts, buyer());
    {
        let remainder = ts::take_from_address<coin::Coin<CURRENCY_TOKEN>>(&ts, buyer());
        assert_eq!(coin::value(&remainder), BUYER_COIN_AMOUNT - expected_cost);
        ts::return_to_address(buyer(), remainder);
    };

    ts::end(ts);
}

/// Negative: buyer has insufficient balance.
#[test]
#[expected_failure(abort_code = 4, location = storage_unit_extension::supply_unit)]
fun test_supply_unit_order_insufficient_balance() {
    let mut ts = ts::begin(governor());
    setup_world(&mut ts);

    let owner_id = create_character(&mut ts, owner(), OWNER_ITEM_ID);
    let buyer_id = create_character(&mut ts, buyer(), BUYER_ITEM_ID);
    let (storage_id, nwn_id) = create_storage_unit(&mut ts, owner_id);
    online_storage_unit(&mut ts, owner(), owner_id, storage_id, nwn_id);
    create_and_authorize_supply_unit(&mut ts, owner_id, storage_id);

    mint_items_to_ephemeral(
        &mut ts,
        owner(),
        owner_id,
        storage_id,
        LENS_ITEM_ID,
        LENS_TYPE_ID,
        LENS_VOLUME,
        LENS_QUANTITY,
    );
    stock_items(&mut ts, owner(), owner_id, storage_id, LENS_TYPE_ID, LENS_QUANTITY);

    // Buyer tries to order with insufficient balance (needs 500, has 100)
    ts::next_tx(&mut ts, buyer());
    {
        let buyer_char = ts::take_shared_by_id<Character>(&ts, buyer_id);
        let mut storage_unit = ts::take_shared_by_id<StorageUnit>(&ts, storage_id);
        let supply_unit_obj = ts::take_shared<supply_unit::SupplyUnit>(&ts);

        let payment = coin::mint_for_testing<CURRENCY_TOKEN>(100, ts::ctx(&mut ts));
        supply_unit::order_items(
            &supply_unit_obj,
            &mut storage_unit,
            &buyer_char,
            payment,
            LENS_QUANTITY,
            ts::ctx(&mut ts),
        );

        ts::return_shared(buyer_char);
        ts::return_shared(storage_unit);
        ts::return_shared(supply_unit_obj);
    };

    ts::end(ts);
}
