#[test_only]
module currency_token::currency_token_tests;

use currency_token::currency_token::CURRENCY_TOKEN;
use sui::{coin, test_scenario as ts};

const MINT_AMOUNT: u64 = 1000;

const ADMIN: address = @0xcafe;
const USER_A: address = @0xbeef;
const USER_B: address = @0xfeed;

/// Test: CURRENCY_TOKEN coins are freely transferable. user_a mints and transfers to user_b.
#[test]
fun test_currency_token_open_transfer() {
    let mut ts = ts::begin(ADMIN);
    {
        let mut treasury_cap = coin::create_treasury_cap_for_testing<CURRENCY_TOKEN>(
            ts::ctx(&mut ts),
        );
        let c = coin::mint(&mut treasury_cap, MINT_AMOUNT, ts::ctx(&mut ts));
        transfer::public_transfer(c, USER_A);
        transfer::public_transfer(treasury_cap, ADMIN);
    };
    ts::next_tx(&mut ts, USER_A);
    {
        let coin = ts::take_from_sender<coin::Coin<CURRENCY_TOKEN>>(&ts);
        transfer::public_transfer(coin, USER_B);
    };
    ts::next_tx(&mut ts, USER_B);
    {
        let coin = ts::take_from_sender<coin::Coin<CURRENCY_TOKEN>>(&ts);
        assert!(coin::value(&coin) == MINT_AMOUNT, 0);
        transfer::public_transfer(coin, USER_B);
    };
    ts::end(ts);
}
