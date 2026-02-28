# Tokens: Open-Loop Currency and Closed-Loop Tribe Token

Two example token implementations on Sui:

1. **Open-loop currency** – freely transferable coins using the [Currency Standard](https://docs.sui.io/standards/currency)
2. **Closed-loop tribe token** – tokens with a tribe-based transfer policy using the [Closed-Loop Token Standard](https://docs.sui.io/standards/closed-loop-token)

## API Comparison

| Function              | Coin (Open-Loop) | Token (Closed-Loop) | Note                                                       |
| --------------------- | ---------------- | ------------------- | ---------------------------------------------------------- |
| mint                  | +                | +                   | Requires TreasuryCap                                        |
| burn                  | +                | +                   | Requires TreasuryCap                                        |
| join                  | +                | +                   | Public                                                      |
| split                 | +                | +                   | Public                                                      |
| zero                  | +                | +                   | Public                                                      |
| destroy_zero          | +                | +                   | Public                                                      |
| keep                  | -                | +                   | Send token to sender; coin has no transfer restrictions     |
| transfer              | +                | [protected]         | Coin is transferable by default; token requires approval   |
| to_balance/to_coin    | +                | [protected]         | Token conversion to coin requires authorization            |
| from_balance/from_coin| +                | [protected]         | Token creation from coin requires authorization             |
| spend                 | -                | [protected]         | Token can be spent; requires authorization                  |

See [Coin/Token API comparison](https://docs.sui.io/standards/closed-loop-token/coin-token-comparison) for details.

## Modules

- **currency_token** – Currency Standard via `coin_registry`. Coins are freely transferable.
- **tribe_token** – Closed-loop token with `TribeRule` for transfers. Only addresses that own a `Character` in the configured tribe can receive.
- **tribe_rule** – Rule that verifies the recipient’s `Character` belongs to the allowed tribe.

## Prerequisites

- Sui CLI
- For tribe token: [world-contracts](https://github.com/evefrontier/world-contracts) at `../../../world-contracts/contracts/world` (same layout as `smart_gate_extension`)
- For tribe token: World deployed and configured (see [setup-world](../setup-world/readme.md))

## Build

```bash
cd move-contracts/tokens
sui move build
```

For testnet:

```bash
sui move build -e testnet
```

## Publish

**Open-loop currency and Tribe token** (same package, single publish)

```bash
pnpm publish-tokens
```

Or directly:

```bash
cd move-contracts/tokens && sui client publish --gas-budget 100000000
```

After publishing, for OTW currencies you must call `coin_registry::finalize_registration` with the `CoinRegistry` (0xc) and the `Receiving<Currency<CURRENCY_TOKEN>>` to promote the currency. See the [Currency Standard](https://docs.sui.io/standards/currency#coin-finalization) docs.

From the publish output, capture:

- Package ID
- CURRENCY_TREASURY_CAP_ID (TreasuryCap for CURRENCY_TOKEN)
- TRIBE_TREASURY_CAP_ID (TreasuryCap for tribe token)
- TRIBE_TOKEN_POLICY_CAP_ID
- TRIBE_TOKEN_POLICY_ID (shared object)

## Post-publish: Configure tribe token

Set the allowed tribe (e.g. 100) via the `configure_tribe_rule` script or a direct Move call:

```bash
pnpm configure-tribe-token
```

## Scripts

From repo root:

| Script                  | Description                                      |
| ----------------------- | ------------------------------------------------ |
| `pnpm publish-tokens`       | Publish tokens package                         |
| `pnpm configure-tribe-token`| Set allowed tribe for tribe token             |
| `pnpm mint-currency-token`  | Mint CURRENCY_TOKEN coins to an address       |
| `pnpm mint-tribe-token`     | Mint tribe tokens to the sender               |
| `pnpm transfer-tribe-token` | Transfer tribe token (recipient proves tribe) |

Set in `.env`:

- `TOKENS_PACKAGE_ID` – Published tokens package ID
- `CURRENCY_TREASURY_CAP_ID` – TreasuryCap for CURRENCY_TOKEN (open-loop currency)
- `TRIBE_TREASURY_CAP_ID` – TreasuryCap for tribe token
- `TRIBE_TOKEN_POLICY_CAP_ID` – TokenPolicyCap for tribe token
- `TRIBE_TOKEN_POLICY_ID` – TokenPolicy shared object ID

## Tribe token transfer flow

1. Sender calls `token::transfer(token, recipient, ctx)` → receives `ActionRequest`
2. Recipient (or relayer) calls `tribe_rule::verify` with their `Character` to stamp the request
3. Sender (or anyone) calls `token::confirm_request` with the stamped request to complete the transfer

## Tests

```bash
cd move-contracts/tokens
sui move test
```

- **test_currency_token_open_transfer** – CURRENCY_TOKEN coins are freely transferable; user_a mints, transfers to user_b, user_b receives.
- **test_tribe_member_can_receive** – Only addresses with a `Character` in the allowed tribe can receive tribe tokens. Uses world test helpers when available.
- **test_non_tribe_member_cannot_receive** – Recipient with wrong tribe (99 vs 100); `tribe_rule::verify` aborts with `ENotAllowedTribe`. Uses `confirm_request` after verify to consume the `ActionRequest` (verify aborts first, so it is never reached).
