# Builder flow: Host

Run the builder-scaffold flow on your host, targeting **testnet** or a **local network**. The same steps work for any extension example (**smart_gate_extension**, **storage_unit_extension**, or your own); the shared flow uses **smart_gate_extension** for publish and scripts.

> **Prefer Docker?** See [builder-flow-docker.md](builder-flow-docker.md) to run the full flow inside a container with no host tooling.

## Prerequisites

- Sui CLI, Node.js, and pnpm installed on your [host](https://docs.evefrontier.com/quickstart/environment-setup#manual-setup-by-os).
- For testnet: funded accounts (e.g. from [Sui testnet faucet](https://faucet.sui.io/))
- For local: a running Sui local node (see below)

## 1. Clone builder-scaffold (if needed)

See [README Quickstart](../README.md#quickstart).

## 2. Choose your network

**Testnet** — no extra setup; set your CLI to testnet and fund keys via the [faucet](https://faucet.sui.io/).

**Local** — you need a local Sui node running on port 9000.

<details>
<summary>Local node setup</summary>

**Running the Sui node in Docker, commands on host (common):**

1. Start the container in one terminal (it exposes port 9000):

   ```bash
   cd docker
   docker compose run --rm --service-ports sui-dev
   ```

2. In another terminal, point your host Sui CLI at the node:

   ```bash
   sui client new-env --alias localnet --rpc http://127.0.0.1:9000
   ```

3. Wait for the container to log **RPC ready** before running deploy/scripts.

Import the container's keys from `docker/.env.sui` into your host config if needed — see [docker/readme.md — Connect to local node from host](../docker/readme.md#connect-to-local-node-from-host).

**Using Sui CLI directly (node on host):**

```bash
sui start --with-faucet --force-regenesis
```

Then point your host Sui CLI at the local node:

```bash
sui client new-env --alias localnet --rpc http://127.0.0.1:9000
```

</details>

Switch your CLI to the network you're using: `sui client switch --env localnet` or `sui client switch --env testnet`.

## 3. Make sure the keys are funded

You need the same keys in three places: Sui keytool (for publish), world-contracts `.env` (created by `pnpm setup-world` from your keys), and builder-scaffold `.env`. Copy `.env.example` to `.env` first.

**If you use the Docker local node** (from step 2):

- Use the 3 keys in `docker/.env.sui`; import them into keytool and copy into builder-scaffold `.env`. Localnet auto-funds them; for testnet, fund all 3 via the [faucet](https://faucet.sui.io/). See [docker/readme.md — Connect to local node from host](../docker/readme.md#connect-to-local-node-from-host).

**If you use your own node** (e.g. `sui start --with-faucet` on host):

- Create 3 accounts (ADMIN, PLAYER_A, PLAYER_B) **either** by:
  - **Generating new addresses** with Sui CLI: `sui client new-address ed25519 --alias ADMIN`, then PLAYER_A, then PLAYER_B.
  - **Or** importing existing private keys: `sui keytool import <PRIVATE_KEY> ed25519 --alias ADMIN` (and similarly for PLAYER_A, PLAYER_B).
- Fund all 3 (local: `sui client faucet`; testnet: [faucet](https://faucet.sui.io/)).
- Get addresses: `sui client addresses`. Export private keys for `.env` if needed: `sui keytool export --key-identity ADMIN --json` (and PLAYER_A, PLAYER_B).
- Switch to ADMIN for publishing: `sui client switch --address <ADMIN_ADDRESS>`.
- Fill builder-scaffold `.env`: ADMIN_ADDRESS, SPONSOR_ADDRESS (= ADMIN_ADDRESS), ADMIN_PRIVATE_KEY, PLAYER_A_PRIVATE_KEY, PLAYER_B_PRIVATE_KEY.

## 4. Run the end-to-end flow

Run all commands **on your host**, in order. Details for each step are in [builder-flow.md](builder-flow.md).

### 4a. Setup world

[Deploy world and create test resources](builder-flow.md#deploy-world-and-create-test-resources): deploy, configure, create test resources, copy artifacts.

- Run `pnpm setup-world`. It uses `.env` (from [step 3](#3-make-sure-the-keys-are-funded)).
- If the script exits because keys are missing, ensure `.env` has the keys section filled (step 3), then run `pnpm setup-world` again.

### 4b. Publish custom contract

[Publish custom contract](builder-flow.md#publish-custom-contract) — build and publish your extension (e.g. smart_gate_extension) to the network.

### 4c. Configure builder-scaffold .env

[Configure builder-scaffold .env](builder-flow.md#configure-builder-scaffold-env) — create `.env` and set keys, `SUI_NETWORK`, `WORLD_PACKAGE_ID`, `BUILDER_PACKAGE_ID`, `EXTENSION_CONFIG_ID`.

### 4d. Interact with custom contract

[Interact with Custom Contract](builder-flow.md#run-scripts) — run the TypeScript scripts against your published extension.
