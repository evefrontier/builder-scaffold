/// Closed-loop token with tribe-based transfer policy.
/// Only addresses that own a Character in the configured tribe can receive transfers.
/// See: https://docs.sui.io/standards/closed-loop-token
module tokens::tribe_token;

use sui::{coin, token};
use tokens::tribe_rule;

/// One-time witness for uniqueness proof.
public struct TRIBE_TOKEN has drop {}

/// Initialize the tribe token on package publish.
/// Creates TreasuryCap, TokenPolicy with TribeRule for transfers, and shares the policy.
#[allow(deprecated_usage)]
fun init(witness: TRIBE_TOKEN, ctx: &mut TxContext) {
    let (treasury_cap, metadata) = coin::create_currency(
        witness,
        6, // decimals
        b"TRIBE",
        b"Tribe Token",
        b"Closed-loop token: only tribe members can receive",
        option::none(),
        ctx,
    );

    let (mut policy, policy_cap) = token::new_policy(&treasury_cap, ctx);

    // Add TribeRule for transfer action - recipients must prove tribe membership via Character
    token::add_rule_for_action<TRIBE_TOKEN, tribe_rule::TribeRule>(
        &mut policy,
        &policy_cap,
        token::transfer_action(),
        ctx,
    );

    // Add rule config (allowed_tribe must be set by policy owner via configure_tribe_rule)
    token::add_rule_config(
        tribe_rule::rule(),
        &mut policy,
        &policy_cap,
        tribe_rule::new_config(0),
        ctx,
    );

    token::share_policy(policy);

    let sender = ctx.sender();
    transfer::public_transfer(treasury_cap, sender);
    transfer::public_transfer(policy_cap, sender);
    transfer::public_share_object(metadata);
}

/// Configure the allowed tribe for transfers. Only TokenPolicyCap owner can call.
public fun configure_tribe_rule(
    policy: &mut token::TokenPolicy<TRIBE_TOKEN>,
    policy_cap: &token::TokenPolicyCap<TRIBE_TOKEN>,
    allowed_tribe: u32,
) {
    let config = token::rule_config_mut<
        TRIBE_TOKEN,
        tribe_rule::TribeRule,
        tribe_rule::TribeRuleConfig,
    >(
        tribe_rule::rule(),
        policy,
        policy_cap,
    );
    tribe_rule::set_allowed_tribe(config, allowed_tribe);
}

/// Mint new tokens to the transaction sender. Only the TreasuryCap holder can mint.
/// Token has only `key` (no `store`); use token::keep to send to sender.
/// To send to another address, the sender must use token::transfer (with tribe rule verification).
public fun mint(
    treasury_cap: &mut coin::TreasuryCap<TRIBE_TOKEN>,
    amount: u64,
    ctx: &mut TxContext,
) {
    let t = token::mint(treasury_cap, amount, ctx);
    token::keep(t, ctx);
}
