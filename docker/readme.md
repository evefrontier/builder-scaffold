# Sui development environment (Docker)

Single container with **Sui CLI**, **Node.js**, and optional **local node**. Use it to build and deploy Move packages and run TypeScript without installing Sui on your host. You must choose **local** or **testnet** explicitly.

- **Local** – Starts a node and faucet, creates and funds ADMIN / PLAYER_A / PLAYER_B, writes `/workspace/.env.sui`.
- **Testnet** – Imports three Bech32 keys from a mounted `.env.testnet` (ADMIN, PLAYER_A, PLAYER_B), configures the client, and writes `.env.sui` with the same address vars so TS scripts and deploy flows match.
- **Mounts** – `move-contracts` and `ts-scripts` are bind-mounted so you edit on the host and build/run inside the container.

## Build

```bash
docker build -t sui-docker .
```

## Run with shell

Set **`SUI_NETWORK`** to `local` or `testnet` (required):

**Local** – starts a local node, creates and funds ADMIN / PLAYER_A / PLAYER_B:

```bash
docker run -it --rm \
  -e SUI_NETWORK=local \
  -v "$(pwd)/../move-contracts:/workspace/contracts" \
  -v "$(pwd)/../ts-scripts:/workspace/ts-scripts" \
  sui-docker
```

**Testnet** – no local node; use your own keys (with testnet SUI). Add three Bech32 private keys in **`.env.testnet`** so ADMIN / PLAYER_A / PLAYER_B work like local:

Create `.env.testnet` in the docker directory. 

```
ADMIN_PRIVATE_KEY=suiprivkey1...
PLAYER_A_PRIVATE_KEY=suiprivkey1...
PLAYER_B_PRIVATE_KEY=suiprivkey1...
```

Mount it into the container so it appears at `/workspace/.env.testnet`:

```bash
docker run -it --rm \
  -e SUI_NETWORK=testnet \
  -v "$(pwd)/../move-contracts:/workspace/contracts" \
  -v "$(pwd)/../ts-scripts:/workspace/ts-scripts" \
  -v "$(pwd)/.env.testnet:/workspace/.env.testnet" \
  sui-docker
```

On startup the script imports the three keys with aliases ADMIN, PLAYER_A, PLAYER_B and writes `.env.sui` with the same address vars as local. Do not commit `.env.testnet` (add to `.gitignore`).

Optional: override testnet RPC with `-e SUI_RPC_URL=https://fullnode.testnet.sui.io` (default is used if unset).

Inside the container:

- **Env file:** `/workspace/.env.sui` (RPC URL and, for local, ADMIN / PLAYER_A / PLAYER_B addresses).
- **Private keys for TypeScript:** Keys live in the Sui keystore. To get a private key (e.g. for signing in TS scripts):
  ```bash
  sui keytool export --key-identity ADMIN
  ```
  Use the alias or address. Output is Bech32 (e.g. `suiprivkey1...`) for your `.env`. For deterministic keys, import a mnemonic first, then export:
  ```bash
  sui keytool import "your twelve word mnemonic here" ed25519
  sui keytool export --key-identity <ALIAS_OR_ADDRESS>
  ```
- **Build & deploy (local):** Use `-e local` for the Move CLI:
  ```bash
  cd /workspace/contracts/gate
  sui move build -e local
  sui client publish -e local --gas-budget 100000000
  ```
- **Build & deploy (testnet):** Use `-e testnet` and your imported keys:
  ```bash
  sui move build -e testnet
  sui client publish -e testnet --gas-budget 100000000
  ```
  If you see **"Environment \`local\` is not present in Move.toml"** (or testnet), the package was built for another env and `Move.lock` is pinning it. Remove the lock and rebuild: `rm Move.lock && sui move build -e <local|testnet>`.
- **Run TypeScript:** `cd /workspace/ts-scripts`, `npm install`, then run your scripts; use `SUI_RPC_URL` and addresses from `/workspace/.env.sui`.

## What runs on startup

- **If `SUI_NETWORK=local`:** (1) First run only: start local node, create ADMIN/PLAYER_A/PLAYER_B, fund them, write `.env.sui`. (2) Later runs: restart node if PID is gone. (3) Then run your command or `bash`.
- **If `SUI_NETWORK=testnet`:** (1) First run only: switch client to testnet; if `/workspace/.env.testnet` exists with `ADMIN_PRIVATE_KEY`, `PLAYER_A_PRIVATE_KEY`, `PLAYER_B_PRIVATE_KEY` (Bech32), import them with aliases and write `.env.sui` with the same address vars as local; otherwise write `.env.sui` with RPC only. (2) Then run your command or `bash`.
- **If `SUI_NETWORK` is unset or not `local`/`testnet`:** print usage and exit 1.

## Contents

- **Base:** Ubuntu 24.04, Sui CLI (suiup), Node.js 20 LTS.
- **No local Sui install needed:** all `sui` and `node` usage happens inside the container.