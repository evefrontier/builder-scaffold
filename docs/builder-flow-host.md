# Builder flow: Host

Run the builder-scaffold flow on your host, targeting **testnet** or a **local network**. The same steps work for any extension example (**smart_gate**, **storage_unit**, or your own); the shared flow uses **smart_gate** for publish and scripts.

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
   sui client switch --env localnet
   ```

3. Wait for the container to log **RPC ready** before running deploy/scripts.

Import the container’s keys from `docker/.env.sui` into your host config if needed — see [docker/readme.md — Connect to local node from host](../docker/readme.md#connect-to-local-node-from-host).

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

## 3. Fund keys (same in three places)

Use the same keys in: Sui keytool (for publish), world-contracts `.env`, and builder-scaffold `.env`.

**If using the Docker local node:**  
Use the three keys in `docker/.env.sui`; import them into keytool and copy into both `.env` files. Localnet auto-funds them; for testnet, fund all three via the faucet.

**If using your own node (e.g. `sui start --with-faucet` on host):**

- Create three accounts (ADMIN, Player A, Player B):
  - **New addresses:**  
    `sui client new-address ed25519 --alias admin` (and `player-a`, `player-b`)
  - **Or import:**  
    `sui keytool import <PRIVATE_KEY_BASE64> ed25519 --alias admin` (and similarly for player-a, player-b)
- Fund all three (local: `sui client faucet`; testnet: [faucet](https://faucet.sui.io/))
- Get addresses: `sui client addresses`
- For `.env` private keys: `sui keytool export --key admin` (and player-a, player-b)
- Use ADMIN for publishing: `sui client switch --address <ADMIN_ADDRESS>`
- Set these keys and addresses in world-contracts `.env` and builder-scaffold `.env` in the shared flow steps below.

## 4. Run the end-to-end flow

Run all commands **on your host**, in order. 

| Step | Section |
|------|---------|
| 1 | [Deploy world and create test resources](builder-flow.md#deploy-world-and-create-test-resources) |
| 2 | [Copy world artifacts into builder-scaffold](builder-flow.md#copy-world-artifacts-into-builder-scaffold) |
| 3 | [Configure builder-scaffold .env](builder-flow.md#configure-builder-scaffold-env) |
| 4 | [Publish custom contract](builder-flow.md#publish-custom-contract) |
| 5 | [Interact with Custom Contract](builder-flow.md#run-scripts) |

**Host context:** **world-contracts** is a sibling of **builder-scaffold** (e.g. `workspace/world-contracts`, `workspace/builder-scaffold`). For the first section (deploy world), use `cp env.example .env` in world-contracts and fill keys/addresses manually.
