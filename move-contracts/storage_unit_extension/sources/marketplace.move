/// Marketplace extension demonstrating `withdraw_by_owner`, `deposit_to_owned`,
/// `withdraw_item`, and `deposit_item`.
///
/// Listing data (price, payment type) lives in the extension's shared object.
/// Main storage is used only for escrow until a buyer completes the trade.
///
/// - No withdraw_from_owned: seller/buyer use withdraw_by_owner with OwnerCap
/// - Item object model: Item carries parent_id; deposit checks parent_id == storage_unit_id
///
/// Flow:
/// 1. Storage owner calls create_marketplace to create the extension's shared object.
/// 2. Seller calls list_item with price (payment_type_id, payment_quantity); item moves to main (escrow).
/// 3. Buyer calls buy_item (seller can be offline); extension enforces stored price, completes swap.
///
/// No AdminACL required -- fully usable by external extensions.
module storage_unit_extension::marketplace;

use world::{access::OwnerCap, character::Character, storage_unit::StorageUnit};

public struct MarketAuth has drop {}

public fun market_auth(): MarketAuth {
    MarketAuth {}
}

/// Listing metadata stored in the extension. Main storage holds the item in escrow.
public struct Listing has drop, store {
    listed_type_id: u64,
    quantity: u32,
    seller_character_id: ID,
    payment_type_id: u64,
    payment_quantity: u32,
}

/// Shared object holding the current listing. One active listing per marketplace.
public struct Marketplace has key {
    id: UID,
    storage_unit_id: ID,
    listing: Option<Listing>,
}

/// Create a marketplace for the given storage unit. Call once per storage unit.
/// Storage unit owner must authorize MarketAuth separately via authorize_extension.
public fun create_marketplace(
    storage_unit: &StorageUnit,
    owner_cap: &OwnerCap<StorageUnit>,
    ctx: &mut TxContext,
) {
    let storage_unit_id = object::id(storage_unit);
    // Verify caller owns the storage unit
    assert!(object::id(owner_cap) == storage_unit.owner_cap_id(), 1);
    let marketplace = Marketplace {
        id: object::new(ctx),
        storage_unit_id,
        listing: option::none(),
    };
    transfer::share_object(marketplace);
}

/// Seller lists an item with a price. Item moves to main (escrow); listing stored in extension.
public fun list_item<T: key>(
    marketplace: &mut Marketplace,
    storage_unit: &mut StorageUnit,
    seller_character: &Character,
    seller_owner_cap: &OwnerCap<T>,
    type_id: u64,
    quantity: u32,
    payment_type_id: u64,
    payment_quantity: u32,
    ctx: &mut TxContext,
) {
    assert!(object::id(storage_unit) == marketplace.storage_unit_id, 2);
    assert!(option::is_none(&marketplace.listing), 3); // One listing at a time

    let item = world::storage_unit::withdraw_by_owner(
        storage_unit,
        seller_character,
        seller_owner_cap,
        type_id,
        quantity,
        ctx,
    );
    world::storage_unit::deposit_item(storage_unit, seller_character, item, MarketAuth {}, ctx);

    marketplace.listing =
        option::some(Listing {
            listed_type_id: type_id,
            quantity,
            seller_character_id: object::id(seller_character),
            payment_type_id,
            payment_quantity,
        });
}

/// Buyer purchases the listed item. Extension enforces the stored price.
/// seller_character is passed for payment delivery (buyer must provide it).
public fun buy_item<T: key>(
    marketplace: &mut Marketplace,
    storage_unit: &mut StorageUnit,
    buyer_character: &Character,
    seller_character: &Character,
    buyer_owner_cap: &OwnerCap<T>,
    ctx: &mut TxContext,
) {
    assert!(object::id(storage_unit) == marketplace.storage_unit_id, 2);
    let listing = option::extract(&mut marketplace.listing);
    assert!(object::id(seller_character) == listing.seller_character_id, 4);

    let listed_item = world::storage_unit::withdraw_item(
        storage_unit,
        buyer_character,
        MarketAuth {},
        listing.listed_type_id,
        listing.quantity,
        ctx,
    );
    let payment_item = world::storage_unit::withdraw_by_owner(
        storage_unit,
        buyer_character,
        buyer_owner_cap,
        listing.payment_type_id,
        listing.payment_quantity,
        ctx,
    );
    world::storage_unit::deposit_to_owned(
        storage_unit,
        seller_character,
        payment_item,
        MarketAuth {},
        ctx,
    );
    world::storage_unit::deposit_to_owned(
        storage_unit,
        buyer_character,
        listed_item,
        MarketAuth {},
        ctx,
    );
}
