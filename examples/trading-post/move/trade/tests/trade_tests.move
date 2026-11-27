#[test_only]
module trade::trade_tests;

use core::request;
use currency::EVE::EVE;
use std::unit_test::assert_eq;
use sui::coin;
use sui::test_scenario as ts;
use trade::allowlist::{Self, Allowlist};
use trade::payment;

const OWNER: address = @0xA;
const BUYER: address = @0xB;

#[test]
fun pay_sends_the_coin_to_the_recipient() {
    let mut scenario = ts::begin(BUYER);
    let mut req = request::new_for_testing(
        option::none(),
        vector[payment::payment_requirement(100, OWNER)],
    );
    let coin = coin::mint_for_testing<EVE>(100, scenario.ctx());
    payment::pay(&mut req, coin, scenario.ctx());
    assert_eq!(req.requires().length(), 0);
    req.destroy();

    scenario.next_tx(OWNER);
    let received = scenario.take_from_address<coin::Coin<EVE>>(OWNER);
    assert_eq!(received.value(), 100);
    scenario.return_to_sender(received);
    scenario.end();
}

#[test, expected_failure(abort_code = payment::EWrongAmount)]
fun pay_rejects_the_wrong_amount() {
    let mut scenario = ts::begin(BUYER);
    let mut req = request::new_for_testing(
        option::none(),
        vector[payment::payment_requirement(100, OWNER)],
    );
    let coin = coin::mint_for_testing<EVE>(99, scenario.ctx());
    payment::pay(&mut req, coin, scenario.ctx());
    abort
}

#[test, expected_failure(abort_code = request::EWrongRequirementType)]
fun pay_cannot_satisfy_another_requirement() {
    let mut scenario = ts::begin(BUYER);
    let mut req = request::new_for_testing(
        option::none(),
        vector[allowlist::on_allowlist_requirement(object::id_from_address(@0x1))],
    );
    let coin = coin::mint_for_testing<EVE>(100, scenario.ctx());
    payment::pay(&mut req, coin, scenario.ctx());
    abort
}

#[test]
fun allowlist_add_and_remove() {
    let mut scenario = ts::begin(OWNER);
    let cap = allowlist::create(scenario.ctx());
    scenario.next_tx(OWNER);
    let mut list = scenario.take_shared<Allowlist>();
    let member = object::id_from_address(@0xC);

    list.add(&cap, member);
    list.add(&cap, member);
    assert!(list.contains(member));
    list.remove(&cap, member);
    assert!(!list.contains(member));

    ts::return_shared(list);
    transfer::public_transfer(cap, OWNER);
    scenario.end();
}

#[test, expected_failure(abort_code = allowlist::EWrongAllowlist)]
fun allowlist_rejects_another_lists_cap() {
    let mut scenario = ts::begin(OWNER);
    let cap_a = allowlist::create(scenario.ctx());
    let cap_b = allowlist::create(scenario.ctx());
    scenario.next_tx(OWNER);
    let mut list_a = scenario.take_shared_by_id<Allowlist>(cap_a.allowlist_id());
    list_a.add(&cap_b, object::id_from_address(@0xC));
    abort
}
