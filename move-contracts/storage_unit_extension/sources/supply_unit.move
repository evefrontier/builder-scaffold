/// Supply unit extension: pay with CURRENCY_TOKEN to receive items from storage unit stock.
///
/// A storage unit holds item stock in main storage. Users pay with CURRENCY_TOKEN to a
/// collection address; the extension splits exact payment, transfers to collection,
/// and deposits items into the user's ephemeral inventory. Price and collection address
/// are configured per supply unit.
module storage_unit_extension::supply_unit;

use sui::coin;
use tokens::currency_token::CURRENCY_TOKEN;
use world::{character::Character, storage_unit::StorageUnit};

public struct SupplyAuth has drop {}

public fun supply_auth(): SupplyAuth {
    SupplyAuth {}
}

/// Shared object holding supply unit config. One per storage unit.
public struct SupplyUnit has key {
    id: UID,
    storage_unit_id: ID,
    collection_address: address,
    price_per_item: u64,
    item_type_id: u64,
}

/// Create a supply unit for the given storage unit. Call once per storage unit.
public fun create_supply_unit(
    storage_unit: &StorageUnit,
    owner_cap: &world::access::OwnerCap<StorageUnit>,
    collection_address: address,
    price_per_item: u64,
    item_type_id: u64,
    ctx: &mut TxContext,
) {
    assert!(object::id(owner_cap) == storage_unit.owner_cap_id(), 1);
    let supply_unit = SupplyUnit {
        id: object::new(ctx),
        storage_unit_id: object::id(storage_unit),
        collection_address,
        price_per_item,
        item_type_id,
    };
    transfer::share_object(supply_unit);
}

/// Admin deposits item stock into main. Caller must have withdrawn the item from their
/// ephemeral (via withdraw_by_owner) before calling.
public fun stock_supply_unit(
    supply_unit: &SupplyUnit,
    storage_unit: &mut StorageUnit,
    admin_character: &Character,
    item: world::inventory::Item,
    ctx: &mut TxContext,
) {
    assert!(object::id(storage_unit) == supply_unit.storage_unit_id, 2);
    world::storage_unit::deposit_item(
        storage_unit,
        admin_character,
        item,
        SupplyAuth {},
        ctx,
    );
}

/// User orders items by paying with CURRENCY_TOKEN. Extension splits exact payment amount,
/// transfers to collection address, returns remainder to user, withdraws items, deposits
/// to character ephemeral.
public fun order_items(
    supply_unit: &SupplyUnit,
    storage_unit: &mut StorageUnit,
    buyer_character: &Character,
    mut payment: coin::Coin<CURRENCY_TOKEN>,
    quantity: u32,
    ctx: &mut TxContext,
) {
    assert!(object::id(storage_unit) == supply_unit.storage_unit_id, 2);
    assert!(quantity > 0, 3);

    let total_cost = (supply_unit.price_per_item as u64) * (quantity as u64);
    assert!(coin::value(&payment) >= total_cost, 4);

    // Supply check: withdraw_item will abort if insufficient stock

    let payment_portion = coin::split(&mut payment, total_cost, ctx);
    transfer::public_transfer(payment_portion, supply_unit.collection_address);
    transfer::public_transfer(payment, ctx.sender());

    let item = world::storage_unit::withdraw_item(
        storage_unit,
        buyer_character,
        SupplyAuth {},
        supply_unit.item_type_id,
        quantity,
        ctx,
    );
    world::storage_unit::deposit_to_owned(
        storage_unit,
        buyer_character,
        item,
        SupplyAuth {},
        ctx,
    );
}
