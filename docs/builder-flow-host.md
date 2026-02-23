# Builder flow: host

Run the builder-scaffold flow on your host machine, targeting **testnet** or a **local network**. The same steps work for any extension example (**smart_gate**, **storage_unit**, or your own); this guide uses **smart_gate** for the publish and run-scripts steps.

> **Prefer Docker?** See [builder-flow-docker.md](./builder-flow-docker.md) to run the full flow inside a container with no host tooling required.

## 1. Prerequisites

- Sui CLI, Node.js, and pnpm installed on your host
- For testnet: funded accounts (e.g. from [Sui testnet faucet](https://faucet.sui.io/))
- For local: a running Sui local node (see below)

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

**Using Docker:**

```bash
cd docker
docker compose run --rm --service-ports sui-dev
```

Import the container's keys from `docker/.env.sui` into your host config.

**Using Sui CLI directly:**

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

> **Coming soon:** These manual steps will be simplified into a single setup command. See [setup-world/readme.md](../setup-world/readme.md) for details.

From your workspace directory (parent of `builder-scaffold`), clone `world-contracts` as a sibling and deploy:

```bash
cd ..   # workspace (parent of builder-scaffold)
git clone https://github.com/evefrontier/world-contracts.git
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

Pick an example (e.g. **smart_gate** or **storage_unit**); use its folder in `move-contracts/`:

```bash
cd move-contracts/smart_gate   # or storage_unit, or your package
sui client publish --build-env testnet   # testnet
sui client test-publish --build-env testnet --pubfile-path ../../deployments/localnet/Pub.localnet.toml   # localnet
```

Set `BUILDER_PACKAGE_ID` and `EXTENSION_CONFIG_ID` in `.env` from the publish output.

## 8. Run scripts

For the **smart_gate** example (scripts are in the repo root):

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
