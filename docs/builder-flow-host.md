# Builder flow: host

Run the builder-scaffold flow on your host machine, targeting **testnet** or a **local network**. The same steps work for any extension example (**smart_gate_extension**, **storage_unit_extension**, or your own); this guide uses **smart_gate_extension** for the publish and run-scripts steps.

> **Prefer Docker?** See [builder-flow-docker.md](./builder-flow-docker.md) to run the full flow inside a container with no host tooling required.

## 1. Prerequisites

- **Sui CLI (latest)**, Node.js, and pnpm installed on your host
- For testnet: funded accounts (e.g. from [Sui testnet faucet](https://faucet.sui.io/))
- For local: a running Sui local node (see below)

> **Sui CLI version:** The Docker node and world-contracts scripts require the latest Sui CLI. Install or upgrade via [suiup](https://github.com/MystenLabs/suiup):
> ```bash
> curl -sSfL https://raw.githubusercontent.com/MystenLabs/suiup/main/install.sh | sh
> suiup install sui     # install latest
> # or to upgrade:
> suiup update sui
> sui --version
> ```

## 2. Clone builder-scaffold (if needed)

If you haven’t already, run the [common clone step](../README.md#quickstart) from the main README:

```bash
mkdir -p workspace && cd workspace
git clone https://github.com/evefrontier/builder-scaffold.git
cd builder-scaffold
```

## 3. Choose your network

**Testnet** — no extra setup, just set your cli to the right network.

**Local** — you need a local Sui node running on port 9000.

<details>
<summary>Local node setup</summary>

**Node in Docker, commands on host (common):**

1. Start the container (in one terminal); it exposes port 9000:

   ```bash
   cd docker
   docker compose run --rm --service-ports sui-dev
   ```

2. In another terminal, configure your host Sui CLI to use the node:

   ```bash
   sui client new-env --alias localnet --rpc http://127.0.0.1:9000
   sui client switch --env localnet
   ```

3. `pnpm setup-world-with-version` handles the rest automatically — it imports the admin key from `docker/.env.sui` and switches the active address before deploying. Wait for the container to log `RPC ready` first.

**Using Sui CLI directly (node on host):**

```bash
sui start --with-faucet --force-regenesis
```

Then point your host Sui CLI at the local node:

```bash
sui client new-env --alias localnet --rpc http://127.0.0.1:9000
```
</details>


```bash
sui client switch --env testnet   # or localnet
```

## 4. Deploy world and create test resources

**Option A: Automated (recommended)**

From builder-scaffold root, set `WORLD_CONTRACTS_BRANCH` (and optional `WORLD_CONTRACTS_COMMIT`) in `.env`, then:

```bash
cd builder-scaffold
pnpm setup-world-with-version
```

The script clones world-contracts (if needed), checkouts the branch, deploys, configures, seeds, and copies artifacts. See [setup-world/readme.md](../setup-world/readme.md).

**First run after clone:** If world-contracts was just cloned and has no `.env`, the script copies `env.example` to `.env` and exits. Fill in `ADMIN_ADDRESS`, `SPONSOR_ADDRESS`, and `GOVERNOR_PRIVATE_KEY` (or `ADMIN_PRIVATE_KEY`) in `world-contracts/.env`, then run again.

**Clean rebuild (new branch/commit):** Run `pnpm rebuild-world` or `pnpm setup-world-with-version --clean` to remove stale artifacts before deploy.

**Option B: Manual**

From your workspace directory (parent of `builder-scaffold`), clone `world-contracts` at a stable tag as a sibling and deploy.

> **Check the latest stable tag** before cloning: [github.com/evefrontier/world-contracts/tags](https://github.com/evefrontier/world-contracts/tags)  
> Substitute `<latest-tag>` with the most recent tag (e.g. `v0.0.15`).

```bash
cd ..   # workspace (parent of builder-scaffold)
git clone -b <latest-tag> https://github.com/evefrontier/world-contracts.git
cd world-contracts
cp env.example .env
# Set SUI_NETWORK=testnet (or localnet) and fill in your keys
# For development, ADMIN_ADDRESS and SPONSOR_ADDRESS can be the same
# GOVERNOR_PRIVATE_KEY is optional or can be the same as ADMIN_PRIVATE_KEY
pnpm install
pnpm deploy-world testnet       # or localnet
pnpm configure-world testnet    # or localnet
pnpm create-test-resources testnet   # or localnet
```

## 5. Copy world artifacts into builder-scaffold

*(Skip if you used Option A — the script already copies.)*

```bash
NETWORK=localnet   # or testnet
mkdir -p ../builder-scaffold/deployments/$NETWORK/
cp -r deployments/* ../builder-scaffold/deployments/
cp test-resources.json ../builder-scaffold/test-resources.json
cp "contracts/world/Pub.localnet.toml" "../builder-scaffold/deployments/localnet/Pub.localnet.toml"
```

## 6. Configure builder-scaffold .env

```bash
cd ../builder-scaffold
cp .env.example .env
```

Set the following in `.env`:
- Same keys/addresses as world-contracts
- `SUI_NETWORK=testnet` (or `localnet`)
- `WORLD_PACKAGE_ID` — from `deployments/<network>/extracted-object-ids.json` (`world.packageId`)

## 7. Publish custom contract

Pick an example (e.g. **smart_gate_extension** or **storage_unit_extension**); use its folder in `move-contracts/`:

```bash
cd move-contracts/smart_gate_extension   # or storage_unit_extension, or your package
sui client publish --build-env testnet   # testnet
sui client test-publish --build-env testnet --pubfile-path ../../deployments/localnet/Pub.localnet.toml   # localnet
```

Set `GATE_EXTENSION_PACKAGE_ID` and `GATE_EXTENSION_CONFIG_ID` in `.env` from the publish output (or run `pnpm publish-smart-gate-extension` to capture them automatically).

## 8. Run scripts

For the **smart_gate_extension** example (scripts are in the repo root):

```bash
cd ../..   # builder-scaffold root
pnpm install
pnpm configure-rules
pnpm authorise-gate
pnpm authorise-storage-unit
pnpm issue-tribe-jump-permit
pnpm jump-with-permit
pnpm collect-corpse-bounty
```
