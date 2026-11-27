/// A builder-defined requirement: the player pays an exact amount of EVE to a
/// fixed recipient, usually the owner.
///
/// The owner adds `payment_requirement(amount, recipient)` to an action. A
/// player's transaction satisfies it by calling `pay` with a coin of exactly
/// that amount. The coin goes straight to the recipient; this package never
/// holds it.
module trade::payment;

use core::request::{Self, Request};
use core::requirement::{Self, Requirement};
use currency::EVE::EVE;
use sui::bcs;
use sui::coin::Coin;
use sui::event;

#[error(code = 0)]
const EWrongAmount: vector<u8> = b"The payment is not the required amount";

/// The requirement type. Its fields are the price and who receives it.
public struct Payment has drop {
    amount: u64,
    recipient: address,
}

/// Emitted for each payment, so a dApp or bot can list sales.
public struct Paid has copy, drop {
    payer: address,
    recipient: address,
    amount: u64,
}

/// Build the requirement, to add to an owner action. `amount` is in the
/// smallest unit of EVE.
public fun payment_requirement(amount: u64, recipient: address): Requirement {
    requirement::from_config(option::none(), Payment { amount, recipient })
}

/// Handler: satisfies the next requirement by sending `coin` to the recipient.
/// Aborts unless the coin holds exactly the required amount.
public fun pay(req: &mut Request, coin: Coin<EVE>, ctx: &TxContext) {
    let (requirement, frame) = req.take_next(internal::permit<Payment>());
    // Read the settings in the order the struct declares them.
    let mut data = bcs::new(requirement.data());
    let amount = data.peel_u64();
    let recipient = data.peel_address();
    assert!(coin.value() == amount, EWrongAmount);
    transfer::public_transfer(coin, recipient);
    event::emit(Paid { payer: ctx.sender(), recipient, amount });
    request::destroy_empty_frame(frame);
}
