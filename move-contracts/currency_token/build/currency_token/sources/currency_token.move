/// Open-loop currency using the Sui Currency Standard (coin_registry).
/// Coins are freely transferable and can be wrapped, stored, and used anywhere.
/// See: https://docs.sui.io/standards/currency
module currency_token::currency_token;

use sui::{coin, coin_registry};

/// One-time witness for uniqueness proof.
public struct CURRENCY_TOKEN has drop {}

/// Initialize the open-loop currency on package publish.
/// Creates a Currency in the Coin Registry and transfers TreasuryCap + MetadataCap to the publisher.
/// For OTW currencies, a follow-up transaction must call `coin_registry::finalize_registration`
/// with the CoinRegistry (0xc) and the Receiving<Currency<CURRENCY_TOKEN>> to promote the currency.
fun init(witness: CURRENCY_TOKEN, ctx: &mut TxContext) {
    let (builder, treasury_cap) = coin_registry::new_currency_with_otw(
        witness,
        6, // decimals
        b"OPEN".to_string(),
        b"Open Loop Currency".to_string(),
        b"Freely transferable currency example".to_string(),
        b"".to_string(), // icon_url
        ctx,
    );

    let metadata_cap = coin_registry::finalize(builder, ctx);
    let sender = ctx.sender();

    transfer::public_transfer(treasury_cap, sender);
    transfer::public_transfer(metadata_cap, sender);
}

/// Mint new coins. Only the TreasuryCap holder can mint.
public fun mint(
    treasury_cap: &mut coin::TreasuryCap<CURRENCY_TOKEN>,
    amount: u64,
    recipient: address,
    ctx: &mut TxContext,
) {
    let c = coin::mint(treasury_cap, amount, ctx);
    transfer::public_transfer(c, recipient);
}
