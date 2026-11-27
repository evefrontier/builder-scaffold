# Trading Post (Cycle 8)

An example for building on EVE Frontier's **v1 world contracts** (the [`dev` branch of world-contracts](https://github.com/evefrontier/world-contracts/tree/dev)), the contracts for Cycle 8. It runs on a local Sui network that you start with one command, and every step checks its own result, so you can confirm it works before you change anything.

> **Early.** The v1 contracts are still in development and are not yet on a public server, so this example runs on a local network only. It is pinned to one world-contracts snapshot image (see [`world.env`](world.env)) and tested against it. The rest of this repository targets the current world contracts.

Everything in this README runs from this folder:

```bash
cd examples/trading-post
```

The walkthrough is in the builder documentation: **[Tutorial: Trade at a Trading Post](https://docs.evefrontier.com/smart-contracts/tutorial-trading-post)**. This README is the short version.

## What you build

A **trading post**: a player's storage structure that other players trade with when they dock. Four examples, each building on the last:

| # | Example | What it adds | Move code |
| --- | --- | --- | --- |
| 1 | Barter: 10 ore for 1 part | An owner action built from the game's inventory requirements | None |
| 2 | Barter for allowlisted characters only | Your own requirement type: an allowlist | [`allowlist.move`](move/trade/sources/allowlist.move) |
| 3 | Barter with a 5 EVE fee | Your own requirement type: a payment | [`payment.move`](move/trade/sources/payment.move) |
| 4 | Shop: 1 part for 20 EVE | A payment instead of an item | Same as 3 |

Then a **dApp** in [`dapp/`](dapp/) shows the trading post's stock, finds your docked ship, and runs any of the four trades from the browser.

## Requirements

- [Docker](https://docs.docker.com/get-docker/)
- [Node.js](https://nodejs.org/) 24 or later, and [pnpm](https://pnpm.io/installation)
- The [Sui CLI](https://docs.sui.io/guides/developer/getting-started/sui-install), only to run the Move unit tests on your machine

The commands work the same on macOS, Linux and Windows. On Windows, use either [WSL 2](https://learn.microsoft.com/windows/wsl/install) with this repository in your WSL home folder (not under `/mnt/c`), or a native checkout on an NTFS drive. FAT32 and exFAT drives don't work, because pnpm needs links that they don't support. Windows is not yet tested.

## Run it

```bash
pnpm localnet:start   # first run downloads the image: about 2 GB
pnpm install
pnpm all              # every step below, in order, stopping at the first failure
```

Or one step at a time:

| Step | Who | What it does |
| --- | --- | --- |
| `pnpm game:setup` | The game (localnet only) | Creates the trading post and two ships, powers them, loads items, docks the ships, and gives the players EVE |
| `pnpm publish:trade` | Seller | Publishes [`move/trade`](move/trade) |
| `pnpm 1:setup`, `pnpm 1:trade` | Seller, then buyer | Example 1 |
| `pnpm 2:setup`, `pnpm 2:trade` | Seller, then buyer | Example 2 |
| `pnpm 3:setup`, `pnpm 3:trade` | Seller, then buyer | Example 3 |
| `pnpm 4:setup`, `pnpm 4:trade` | Seller, then buyer | Example 4 |
| `pnpm balances` | Anyone | Prints the item and EVE balances |
| `pnpm dapp` | Buyer | Starts the dApp at http://localhost:5173 |

Each `trade` step prints balances before and after, checks that they moved by exactly what the action says, and then checks that a bad trade is refused (asking for too much, a player who isn't on the allowlist, or the wrong payment).

`pnpm move:test` runs the Move unit tests. `pnpm localnet:stop` removes the local network and all its state.

## The local network

`pnpm localnet:start` runs a world-contracts **snapshot image**: a local Sui network with the world contracts already deployed, plus the Postgres database its indexer uses. The image is set in [`world.env`](world.env). It copies the deployment details into `vendor/localnet/`, and the scripts read them from there.

To run against another image, such as one built from your own world-contracts changes, create `world.local.env` next to `world.env` (it is not committed) and set `WORLD_IMAGE` to your image's tag. The commands then run against your contracts, so `pnpm all` checks whether your changes break the example.

```
WORLD_IMAGE=world-contracts:my-change-snapshot
WORLD_CONTRACTS_SOURCES=../../../world-contracts
```

The example also needs the world's Move sources and SDK from the same commit as the image. The snapshot images don't include them yet, so `localnet:start` fetches them for the image's commit. An image you built yourself has no commit label, so also set `WORLD_CONTRACTS_SOURCES` to the world-contracts checkout you built it from. That checkout is only read, never changed.

How snapshot images are run and built is in world-contracts' [Docker README](https://github.com/evefrontier/world-contracts/blob/dev/docker/README.md#snapshot-image). Building one locally is not yet documented there: see `scripts/bake-snapshot-image.sh` and the `snapshot` mode of `docker/entrypoint-integration.sh` for how it is done.

## The players

The local network has public test accounts. Their keys are in `vendor/localnet/accounts.json`. **Never use them anywhere else.**

| Account | Role |
| --- | --- |
| `PLAYER_A` | Seller: owns the trading post |
| `PLAYER_B` | Buyer: owns a ship docked at the trading post, on the allowlist |
| `PLAYER_C` | Outsider: owns a docked ship, not on the allowlist |
| `ADMIN`, `SPONSOR`, `EXCHANGE` | The game, used only by `game:setup` |

## Layout

```
localnet/          localnet.ts (start and stop) and compose.yaml for the local network
move/trade/        Move package: allowlist and payment requirements, with unit tests
scripts/src/
  lib/world.ts     transaction builders shared by the scripts and the dApp
  lib/context.ts   network, keys, and IDs
  lib/steps.ts     enable, trade, and check
  game/setup.ts    the game stand-in for localnet
  examples/        rules.ts, and setup.ts and trade.ts for each example
dapp/              React dApp (Vite, @mysten/dapp-kit)
vendor/            created by localnet:start: deployment details, Move sources, world SDK
```

## Public servers

The v1 contracts are not yet on a public server, so this example currently runs on localnet only. The scripts already take `--network testnet` (for example `pnpm publish:trade --network testnet`) and read [`scripts/testnet.example.json`](scripts/testnet.example.json) for a server on Sui testnet, but that path is not yet verified. With `--network testnet`, `publish:trade` uses your own Sui CLI and stops unless its active environment is `testnet`. On a real server, the game does everything `game:setup` does, so you skip that step and fill in your own object IDs.

## Wallets

The dApp signs with a connected wallet such as [EVE Vault](https://docs.evefrontier.com/eve-vault/introduction-to-eve-vault). On localnet it also offers the test accounts, so you can try it without a wallet. To use EVE Vault on localnet, turn on its dev mode and load a test account's key (see [Developer & Localnet](https://docs.evefrontier.com/eve-vault/developer-and-localnet)).

## Known gaps

- `@evefrontier/world-sdk` is not on npm yet. `localnet:start` packs it from the image's world-contracts commit into `vendor/world-sdk.tgz`, and `pnpm install` installs it from there. Start the local network before you install.
- The world SDK imports Node modules, so the dApp swaps them for stubs ([`dapp/src/node-stubs.ts`](dapp/src/node-stubs.ts)).
- There is no ship module yet, so on localnet the ships are storage units, as in world-contracts' own tests.
- Players enable two owner actions on their own ship (`ship_withdraw`, `ship_deposit`) before trading. The trade steps and the dApp do this for you the first time.
