/// Inventory: on-chain item storage with split/join semantics.
///
/// # Architecture — Coin/Balance pattern
///
/// Items use a two-form design inspired by Sui's `Coin` / `Balance` split:
///
/// - **`ItemEntry`** (at-rest) — lightweight data with `copy, drop, store`. Lives inside
///   the `Inventory` struct. No UID, no object overhead. Analogous to `Balance`.
/// - **`Item`** (in-transit) — a full Sui object with `key, store` and a UID. Created on
///   withdrawal, consumed on deposit. Analogous to `Coin`.
///
/// # Parent-ID tracking
///
/// Each transit `Item` carries a `parent_id` — the object ID of the assembly
/// (e.g. StorageUnit) the item was withdrawn from. The parent layer uses this on
/// deposit to verify items are returning to their origin. Location data is also
/// attached as metadata but is not used for deposit validation.
///
/// # Bridging
///
/// - **Game → Chain (mint):** The game server calls an admin-gated function to mint
///   items directly into an on-chain inventory.
/// - **Chain → Game (burn):** Burning emits an `ItemBurnedEvent`; the game server
///   listens and creates the item in-game. Requires a proximity proof.
module world::inventory;

use std::string::String;
use sui::{clock::Clock, event, vec_map::{Self, VecMap}};
use world::{
    access::ServerAddressRegistry,
    character::Character,
    in_game_id::TenantItemId,
    location::{Self, Location}
};

// === Errors ===
#[error(code = 0)]
const ETypeIdEmpty: vector<u8> = b"Type ID cannot be empty";
#[error(code = 1)]
const EInventoryInvalidCapacity: vector<u8> = b"Inventory Capacity cannot be 0";
#[error(code = 2)]
const EInventoryInsufficientCapacity: vector<u8> = b"Insufficient capacity in the inventory";
#[error(code = 3)]
const EItemDoesNotExist: vector<u8> = b"Item not found";
#[error(code = 4)]
const EInventoryInsufficientQuantity: vector<u8> = b"Insufficient quantity in inventory";
#[error(code = 6)]
const ETypeIdMismatch: vector<u8> = b"Item type_id must match for join operation";
#[error(code = 7)]
const ESplitQuantityInvalid: vector<u8> =
    b"Split quantity must be greater than 0 and less than item quantity";

// === Structs ===

/// On-chain inventory that tracks items by `type_id`.
///
/// Each `type_id` maps to a single `ItemEntry`. `used_capacity` is the running
/// total of `volume * quantity` across every entry. It must never exceed
/// `max_capacity`.
public struct Inventory has store {
    max_capacity: u64,
    used_capacity: u64,
    items: VecMap<u64, ItemEntry>,
}

/// At-rest item data stored inside an `Inventory`.
///
/// Has `copy, drop, store` — no UID, no object overhead. Think of this as the
/// `Balance` to `Item`'s `Coin`.
///
/// Does **not** store location — location is just-in-time metadata injected by the
/// parent layer (e.g. StorageUnit) when creating a transit `Item` on withdrawal.
public struct ItemEntry has copy, drop, store {
    tenant: String,
    type_id: u64,
    item_id: u64,
    volume: u64,
    quantity: u32,
}

/// Transit form of an item — created on withdraw, consumed on deposit.
///
/// Carries a fresh UID so it can be transferred between inventories as a
/// first-class Sui object. Destroyed (UID deleted) when deposited.
///
/// `parent_id` is the object ID of the assembly this item was withdrawn from
/// (e.g. a StorageUnit). The parent layer checks this on deposit to ensure items
/// return to their origin.
public struct Item has key, store {
    id: UID,
    parent_id: ID,
    tenant: String,
    type_id: u64,
    item_id: u64,
    volume: u64,
    quantity: u32,
    location: Location,
}

// === Events ===
public struct ItemMintedEvent has copy, drop {
    assembly_id: ID,
    assembly_key: TenantItemId,
    character_id: ID,
    character_key: TenantItemId,
    item_id: u64,
    type_id: u64,
    quantity: u32,
}

public struct ItemBurnedEvent has copy, drop {
    assembly_id: ID,
    assembly_key: TenantItemId,
    character_id: ID,
    character_key: TenantItemId,
    item_id: u64,
    type_id: u64,
    quantity: u32,
}

public struct ItemDepositedEvent has copy, drop {
    assembly_id: ID,
    assembly_key: TenantItemId,
    character_id: ID,
    character_key: TenantItemId,
    item_id: u64,
    type_id: u64,
    quantity: u32,
}

public struct ItemWithdrawnEvent has copy, drop {
    assembly_id: ID,
    assembly_key: TenantItemId,
    character_id: ID,
    character_key: TenantItemId,
    item_id: u64,
    type_id: u64,
    quantity: u32,
}

public struct ItemDestroyedEvent has copy, drop {
    assembly_id: ID,
    assembly_key: TenantItemId,
    item_id: u64,
    type_id: u64,
    quantity: u32,
}

// === View Functions ===
public fun tenant(item: &Item): String {
    item.tenant
}

public fun contains_item(inventory: &Inventory, type_id: u64): bool {
    inventory.items.contains(&type_id)
}

/// Returns the location hash from the transit Item (metadata only, not used for
/// deposit validation — parent_id is used instead).
public fun get_item_location_hash(item: &Item): vector<u8> {
    item.location.hash()
}

/// Returns the object ID of the assembly this item was withdrawn from.
public fun parent_id(item: &Item): ID {
    item.parent_id
}

public fun max_capacity(inventory: &Inventory): u64 {
    inventory.max_capacity
}

public fun type_id(item: &Item): u64 {
    item.type_id
}

public fun quantity(item: &Item): u32 {
    item.quantity
}

// === Package Functions ===

/// Merge `other` into this entry. Both must have the same `type_id`.
public(package) fun join(entry: &mut ItemEntry, other: ItemEntry) {
    assert!(entry.type_id == other.type_id, ETypeIdMismatch);
    entry.quantity = entry.quantity + other.quantity;
}

public(package) fun create(max_capacity: u64): Inventory {
    assert!(max_capacity != 0, EInventoryInvalidCapacity);

    Inventory {
        max_capacity,
        used_capacity: 0,
        items: vec_map::empty(),
    }
}

/// Mints items into inventory (Game → Chain bridge).
///
/// If the type_id already exists, increases quantity in place.
/// Otherwise, creates a new entry.
public(package) fun mint_items(
    inventory: &mut Inventory,
    assembly_id: ID,
    assembly_key: TenantItemId,
    character: &Character,
    tenant: String,
    item_id: u64,
    type_id: u64,
    volume: u64,
    quantity: u32,
) {
    assert!(type_id != 0, ETypeIdEmpty);

    let req_capacity = calculate_volume(volume, quantity);
    let remaining = inventory.max_capacity - inventory.used_capacity;
    assert!(req_capacity <= remaining, EInventoryInsufficientCapacity);
    inventory.used_capacity = inventory.used_capacity + req_capacity;

    let emit_item_id = if (inventory.items.contains(&type_id)) {
        let entry = &mut inventory.items[&type_id];
        entry.quantity = entry.quantity + quantity;
        entry.item_id
    } else {
        inventory.items.insert(type_id, ItemEntry { tenant, type_id, item_id, volume, quantity });
        item_id
    };

    event::emit(ItemMintedEvent {
        assembly_id,
        assembly_key,
        character_id: character.id(),
        character_key: character.key(),
        item_id: emit_item_id,
        type_id,
        quantity,
    });
}

// TODO: remove proximity proof check as it will be handled in the parent module
public(package) fun burn_items_with_proof(
    inventory: &mut Inventory,
    assembly_id: ID,
    assembly_key: TenantItemId,
    character: &Character,
    server_registry: &ServerAddressRegistry,
    location: &Location,
    location_proof: vector<u8>,
    type_id: u64,
    quantity: u32,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    location::verify_proximity_proof_from_bytes(
        server_registry,
        location,
        location_proof,
        clock,
        ctx,
    );
    burn_items(inventory, assembly_id, assembly_key, character, type_id, quantity);
}

/// Deposits a transit `Item` back into the inventory.
///
/// Destroys the `Item`'s UID, extracts its data into an `ItemEntry`, and either
/// joins into the existing entry or creates a new one.
///
/// Parent-ID validation is **not** done here — that is the responsibility of the
/// parent layer (e.g. storage_unit.move) which has access to the assembly's object ID.
public(package) fun deposit_item(
    inventory: &mut Inventory,
    assembly_id: ID,
    assembly_key: TenantItemId,
    character: &Character,
    item: Item,
) {
    let Item { id, parent_id: _, tenant, type_id, item_id, volume, quantity, location } = item;
    id.delete();
    location.remove();

    let req_capacity = calculate_volume(volume, quantity);
    let remaining = inventory.max_capacity - inventory.used_capacity;
    assert!(req_capacity <= remaining, EInventoryInsufficientCapacity);
    inventory.used_capacity = inventory.used_capacity + req_capacity;

    let entry = ItemEntry { tenant, type_id, item_id, volume, quantity };

    let dep_item_id = if (inventory.items.contains(&type_id)) {
        let existing = &mut inventory.items[&type_id];
        let existing_item_id = existing.item_id;
        existing.join(entry);
        existing_item_id
    } else {
        inventory.items.insert(type_id, entry);
        item_id
    };

    event::emit(ItemDepositedEvent {
        assembly_id,
        assembly_key,
        character_id: character.id(),
        character_key: character.key(),
        item_id: dep_item_id,
        type_id,
        quantity,
    });
}

/// Withdraws items from the inventory and wraps them into a transit `Item`.
///
/// `location_hash` is injected by the parent layer (e.g. StorageUnit) — it is not
/// stored in `ItemEntry` since it is just-in-time metadata for the transit `Item`.
///
/// `assembly_id` doubles as the `parent_id` on the resulting `Item`.
public(package) fun withdraw_item(
    inventory: &mut Inventory,
    assembly_id: ID,
    assembly_key: TenantItemId,
    character: &Character,
    type_id: u64,
    quantity: u32,
    location_hash: vector<u8>,
    ctx: &mut TxContext,
): Item {
    assert!(inventory.items.contains(&type_id), EItemDoesNotExist);
    assert!(quantity > 0, ESplitQuantityInvalid);

    let entry = &inventory.items[&type_id];
    assert!(entry.quantity >= quantity, EInventoryInsufficientQuantity);
    let volume = entry.volume;
    let item_id = entry.item_id;
    let tenant = entry.tenant;

    let capacity_freed = calculate_volume(volume, quantity);
    inventory.used_capacity = inventory.used_capacity - capacity_freed;

    if (entry.quantity == quantity) {
        inventory.items.remove(&type_id);
    } else {
        let entry_mut = &mut inventory.items[&type_id];
        entry_mut.quantity = entry_mut.quantity - quantity;
    };

    event::emit(ItemWithdrawnEvent {
        assembly_id,
        assembly_key,
        character_id: character.id(),
        character_key: character.key(),
        item_id,
        type_id,
        quantity,
    });

    Item {
        id: object::new(ctx),
        parent_id: assembly_id,
        tenant,
        type_id,
        item_id,
        volume,
        quantity,
        location: location::attach(location_hash),
    }
}

/// Destroys the inventory, emitting an `ItemDestroyedEvent` per entry.
public(package) fun delete(inventory: Inventory, assembly_id: ID, assembly_key: TenantItemId) {
    let Inventory {
        mut items,
        ..,
    } = inventory;

    while (!items.is_empty()) {
        let (_, entry) = items.pop();
        event::emit(ItemDestroyedEvent {
            assembly_id,
            assembly_key,
            item_id: entry.item_id,
            type_id: entry.type_id,
            quantity: entry.quantity,
        });
    };
    items.destroy_empty();
}

// FUTURE: transfer items between inventory, eg: inventory to inventory on-chain.
// This needs location proof and distance to enforce digital physics.
// public fun transfer_items() {}

// === Private Functions ===

/// Burns items from on-chain inventory (Chain → Game bridge).
///
/// Reduces quantity (or removes the entry entirely if fully burned) and frees
/// the corresponding capacity. Emits an `ItemBurnedEvent` for the game server.
fun burn_items(
    inventory: &mut Inventory,
    assembly_id: ID,
    assembly_key: TenantItemId,
    character: &Character,
    type_id: u64,
    quantity: u32,
) {
    assert!(inventory.items.contains(&type_id), EItemDoesNotExist);

    let entry = &inventory.items[&type_id];
    assert!(entry.quantity >= quantity, EInventoryInsufficientQuantity);
    let item_id = entry.item_id;
    let volume = entry.volume;

    let capacity_freed = calculate_volume(volume, quantity);
    inventory.used_capacity = inventory.used_capacity - capacity_freed;

    if (entry.quantity == quantity) {
        inventory.items.remove(&type_id);
    } else {
        let entry_mut = &mut inventory.items[&type_id];
        entry_mut.quantity = entry_mut.quantity - quantity;
    };

    event::emit(ItemBurnedEvent {
        assembly_id,
        assembly_key,
        character_id: character.id(),
        character_key: character.key(),
        item_id,
        type_id,
        quantity,
    });
}

/// Total capacity consumed by a single entry: `volume * quantity`.
fun calculate_volume(volume: u64, quantity: u32): u64 {
    volume * (quantity as u64)
}

// === Test Functions ===
#[test_only]
public fun remaining_capacity(inventory: &Inventory): u64 {
    inventory.max_capacity - inventory.used_capacity
}

#[test_only]
public fun used_capacity(inventory: &Inventory): u64 {
    inventory.used_capacity
}

#[test_only]
public fun item_quantity(inventory: &Inventory, type_id: u64): u32 {
    inventory.items[&type_id].quantity
}

#[test_only]
public fun item_volume(inventory: &Inventory, type_id: u64): u64 {
    inventory.items[&type_id].volume
}

/// Number of unique type_ids in the inventory.
#[test_only]
public fun inventory_item_length(inventory: &Inventory): u64 {
    inventory.items.length()
}

#[test_only]
public fun burn_items_test(
    inventory: &mut Inventory,
    assembly_id: ID,
    assembly_key: TenantItemId,
    character: &Character,
    type_id: u64,
    quantity: u32,
) {
    burn_items(inventory, assembly_id, assembly_key, character, type_id, quantity);
}

#[test_only]
public fun burn_items_with_proof_test(
    inventory: &mut Inventory,
    assembly_id: ID,
    assembly_key: TenantItemId,
    character: &Character,
    server_registry: &ServerAddressRegistry,
    location: &Location,
    location_proof: vector<u8>,
    type_id: u64,
    quantity: u32,
    ctx: &mut TxContext,
) {
    location::verify_proximity_proof_from_bytes_without_deadline(
        server_registry,
        location,
        location_proof,
        ctx,
    );
    burn_items(inventory, assembly_id, assembly_key, character, type_id, quantity);
}
