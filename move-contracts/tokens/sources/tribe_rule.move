/// Tribe-based transfer rule for closed-loop tokens.
/// Recipients must provide their Character to prove they belong to the allowed tribe.
/// See: https://docs.sui.io/standards/closed-loop-token/rules
module tokens::tribe_rule;

use sui::token;
use world::character::Character;

/// Rule witness type.
public struct TribeRule has drop {}

/// Create rule witness. Package visibility for tribe_token.
public(package) fun rule(): TribeRule {
    TribeRule {}
}

/// Configuration stored in the TokenPolicy. Set by the policy owner.
public struct TribeRuleConfig has store {
    allowed_tribe: u32,
}

/// Create config for init. Friend tribe_token.
public fun new_config(allowed_tribe: u32): TribeRuleConfig {
    TribeRuleConfig { allowed_tribe }
}

/// Set allowed tribe. Called by tribe_token::configure_tribe_rule.
public fun set_allowed_tribe(config: &mut TribeRuleConfig, allowed_tribe: u32) {
    config.allowed_tribe = allowed_tribe;
}

/// Verify that the recipient owns a Character in the allowed tribe.
/// The recipient (or a relayer) must call this with the recipient's Character before confirm_request.
/// Aborts if: recipient is not the character owner, or character's tribe != allowed_tribe.
public fun verify<T>(
    policy: &token::TokenPolicy<T>,
    action_request: &mut token::ActionRequest<T>,
    character: &Character,
    _ctx: &mut TxContext,
) {
    let recipient_opt = token::recipient(action_request);
    assert!(option::is_some(&recipient_opt), ENoRecipient);
    let recipient = *option::borrow(&recipient_opt);
    assert!(world::character::character_address(character) == recipient, ERecipientMismatch);

    let config = token::rule_config<T, TribeRule, TribeRuleConfig>(TribeRule {}, policy);
    assert!(character.tribe() == config.allowed_tribe, ENotAllowedTribe);

    token::add_approval(TribeRule {}, action_request, _ctx);
}

#[error(code = 0)]
const ENoRecipient: vector<u8> = b"Transfer action must have recipient";
#[error(code = 1)]
const ERecipientMismatch: vector<u8> = b"Character owner must match transfer recipient";
#[error(code = 2)]
const ENotAllowedTribe: vector<u8> = b"Character tribe does not match allowed tribe";
