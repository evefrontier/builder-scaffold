#[test_only]
module tribe_token::tribe_token_tests;

use std::string::utf8;
use sui::{test_scenario as ts, token};
use tribe_token::{tribe_rule, tribe_token};
use world::{character, test_helpers};

const ALLOWED_TRIBE: u32 = 100;
const MINT_AMOUNT: u64 = 1000;

/// Setup: create token policy with TribeRule (allowed_tribe=100).
fun setup_tribe_token_policy(ts: &mut ts::Scenario) {
    ts::next_tx(ts, test_helpers::admin());
    {
        let (mut policy, policy_cap) = token::new_policy_for_testing<tribe_token::TRIBE_TOKEN>(
            ts::ctx(ts),
        );
        token::add_rule_for_action<tribe_token::TRIBE_TOKEN, tribe_rule::TribeRule>(
            &mut policy,
            &policy_cap,
            token::transfer_action(),
            ts::ctx(ts),
        );
        token::add_rule_config(
            tribe_rule::rule(),
            &mut policy,
            &policy_cap,
            tribe_rule::new_config(ALLOWED_TRIBE),
            ts::ctx(ts),
        );
        token::share_policy(policy);
        transfer::public_transfer(policy_cap, test_helpers::admin());
    };
}

/// Setup: mint token to user_a (user_a runs mint_for_testing and keep).
fun setup_mint_to_user_a(ts: &mut ts::Scenario) {
    ts::next_tx(ts, test_helpers::user_a());
    {
        let token = token::mint_for_testing<tribe_token::TRIBE_TOKEN>(MINT_AMOUNT, ts::ctx(ts));
        token::keep(token, ts::ctx(ts));
    };
}

/// Setup: create character for user_b with tribe ALLOWED_TRIBE.
fun setup_character_for_user_b(ts: &mut ts::Scenario) {
    ts::next_tx(ts, test_helpers::admin());
    {
        let admin_acl = ts::take_shared<world::access::AdminACL>(ts);
        let mut registry = ts::take_shared<world::object_registry::ObjectRegistry>(ts);
        let ch = character::create_character(
            &mut registry,
            &admin_acl,
            2,
            test_helpers::tenant(),
            ALLOWED_TRIBE,
            test_helpers::user_b(),
            utf8(b"user_b_char"),
            ts::ctx(ts),
        );
        character::share_character(ch, &admin_acl, ts::ctx(ts));
        ts::return_shared(registry);
        ts::return_shared(admin_acl);
    };
}

/// Test: only tribe members can receive. user_b has Character with tribe 100; transfer succeeds.
#[test]
fun test_tribe_member_can_receive() {
    let mut ts = ts::begin(test_helpers::governor());
    test_helpers::setup_world(&mut ts);
    setup_character_for_user_b(&mut ts);
    setup_tribe_token_policy(&mut ts);
    setup_mint_to_user_a(&mut ts);

    ts::next_tx(&mut ts, test_helpers::user_a());
    {
        let token = ts::take_from_sender<token::Token<tribe_token::TRIBE_TOKEN>>(&ts);
        let policy = ts::take_shared<token::TokenPolicy<tribe_token::TRIBE_TOKEN>>(&ts);
        let character = ts::take_shared<world::character::Character>(&ts);

        let mut request = token::transfer(token, test_helpers::user_b(), ts::ctx(&mut ts));
        tribe_rule::verify(&policy, &mut request, &character, ts::ctx(&mut ts));
        let (_, _, _, recipient) = token::confirm_request(&policy, request, ts::ctx(&mut ts));
        assert!(*option::borrow(&recipient) == test_helpers::user_b(), 0);

        ts::return_shared(policy);
        ts::return_shared(character);
    };

    ts::end(ts);
}

/// Test: non-tribe member cannot receive. user_b has Character with tribe 99 (not 100); verify aborts.
/// We call confirm_request after verify to consume the ActionRequest (verify aborts first, so it's never reached).
#[test, expected_failure(abort_code = ::tribe_token::tribe_rule::ENotAllowedTribe)]
fun test_non_tribe_member_cannot_receive() {
    let mut ts = ts::begin(test_helpers::governor());
    test_helpers::setup_world(&mut ts);
    // Create character for user_b with wrong tribe (99 instead of 100)
    ts::next_tx(&mut ts, test_helpers::admin());
    {
        let admin_acl = ts::take_shared<world::access::AdminACL>(&ts);
        let mut registry = ts::take_shared<world::object_registry::ObjectRegistry>(&ts);
        let ch = character::create_character(
            &mut registry,
            &admin_acl,
            3,
            test_helpers::tenant(),
            99, // wrong tribe
            test_helpers::user_b(),
            utf8(b"user_b_wrong_tribe"),
            ts::ctx(&mut ts),
        );
        character::share_character(ch, &admin_acl, ts::ctx(&mut ts));
        ts::return_shared(registry);
        ts::return_shared(admin_acl);
    };
    setup_tribe_token_policy(&mut ts);
    setup_mint_to_user_a(&mut ts);

    ts::next_tx(&mut ts, test_helpers::user_a());
    {
        let token = ts::take_from_sender<token::Token<tribe_token::TRIBE_TOKEN>>(&ts);
        let policy = ts::take_shared<token::TokenPolicy<tribe_token::TRIBE_TOKEN>>(&ts);
        let character = ts::take_shared<world::character::Character>(&ts);

        let mut request = token::transfer(token, test_helpers::user_b(), ts::ctx(&mut ts));
        tribe_rule::verify(&policy, &mut request, &character, ts::ctx(&mut ts)); // aborts: tribe 99 != 100
        let (_, _, _, _) = token::confirm_request(&policy, request, ts::ctx(&mut ts)); // consumes request; never reached

        ts::return_shared(policy);
        ts::return_shared(character);
    };

    ts::end(ts);
}
