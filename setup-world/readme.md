# Setup EVE Frontier world

## Why

In the real game, players create a **Smart Character** (an on-chain identity that owns all their assemblies), build a **Network Node** (the power source that burns fuel to produce energy), and deploy assemblies like **Smart Storage Units** and **Smart Gates**. All assemblies need energy to function.

During development, the deploy and seed steps recreate this on a local (or test) network so you have real on-chain objects to build and test against.

## What gets created

The seed step simulates those in-game actions automatically:

1. A test **Smart Character** — has ownership access to all in-game objects on-chain
2. A **Network Node** — fueled and burning energy
3. A **Smart Storage Unit** — online, with test items deposited
4. Two **Smart Gates** — online and linked for jumping

For more info on Smart Character, Network Node, and Storage Unit, see the [world-contracts](https://github.com/evefrontier/world-contracts) repo and docs.

---

## Prerequisites

- Git, Node.js, Sui CLI (or use the [Docker environment](../docker/readme.md))

---

## Quick start (world only)

For the **full** builder flow (environment → world → contract → scripts), follow one of the following guides: [Docker](../docs/builder-flow-docker.md) or [Host](../docs/builder-flow-host.md). The steps below cover only the world-contracts part; assume `world-contracts` and `builder-scaffold` are sibling directories.

### setup-world-with-version (one command)

From builder-scaffold root:

```bash
pnpm setup-world-with-version
```

This script clones world-contracts to `WORLD_CONTRACTS_DIR` (default `../world-contracts`) if it doesn't exist, checks out `WORLD_CONTRACTS_BRANCH` (and optionally `WORLD_CONTRACTS_COMMIT`) in `.env`, deploys, configures, seeds, and copies artifacts. It ensures the deployed world matches the version your extensions build against.

**First run / localnet + Docker:** When `SUI_NETWORK=localnet` and `docker/.env.sui` exists, the script automatically creates world-contracts `.env`, imports the admin key into your Sui CLI, and switches the active address. This covers both "inside the container" and "node in Docker, commands on host" flows with no manual key setup.

**Host (non-Docker / testnet):** If world-contracts has no `.env`, the script copies `env.example` and exits — fill in your keys and run again.

**Docker bind mount:** When using the [Docker flow](../docs/builder-flow-docker.md), world-contracts is bind-mounted. The script operates on `WORLD_CONTRACTS_DIR` (default `../world-contracts`). If the mount is empty, the script clones into it. Run from `/workspace/builder-scaffold`. See [builder-flow-docker.md](../docs/builder-flow-docker.md#setup-world-with-version-script).

### Clean and rebuild (new branch/commit)

When switching to a new branch or commit, use a clean rebuild to avoid stale artifacts:

```bash
pnpm rebuild-world
# or: pnpm clean-world && pnpm setup-world-with-version
# or: pnpm setup-world-with-version --clean
```

For a fully fresh localnet, restart the container or local node first (it spins up a new chain).

> **Coming soon:** Move package dependency resolution via [MVR](https://docs.sui.io/guides/developer/packages/move-package-management).

---

### Manual: Clone and deploy the world

```bash
git clone https://github.com/evefrontier/world-contracts.git
cd world-contracts
cp env.example .env   # fill in keys, ADMIN_ADDRESS, SPONSOR_ADDRESS, etc.
pnpm install
pnpm deploy-world localnet   # or testnet
pnpm configure-world localnet
```

This publishes the world package and configures access control, fuel/energy rates, and gate distances.

### 2. Seed test resources

Creates the Smart Character, Network Node, Storage Unit, and Gates listed above:

```bash
pnpm create-test-resources localnet   # use same network as deploy/configure
```

### 3. Copy output into builder-scaffold

```bash
# From world-contracts directory
NETWORK=localnet   # or testnet
mkdir -p ../builder-scaffold/deployments/$NETWORK/
cp -r deployments/* ../builder-scaffold/deployments/
cp test-resources.json ../builder-scaffold/test-resources.json
cp "contracts/world/Pub.localnet.toml" "../builder-scaffold/deployments/localnet/Pub.localnet.toml"
```

- `deployments/<network>/extracted-object-ids.json` — world package ID and shared object IDs
- `test-resources.json` — item IDs used to derive on-chain object IDs. Read more about object id derivation [here](https://docs.evefrontier.com/smart-contracts/object-model)

---

## Next steps

- [Move contracts](../move-contracts/readme.md) — build and publish your extension (e.g. `smart_gate_extension`)
- [TypeScript scripts](../ts-scripts/readme.md) — run scripts against the seeded resources
- Full flow in one place: [Docker](../docs/builder-flow-docker.md) or [Host](../docs/builder-flow-host.md)
