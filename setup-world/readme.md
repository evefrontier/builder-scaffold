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

<!--TODO  change link -->
For more info on Smart Character, Network Node, and Storage Unit, see the [world-contracts](https://github.com/evefrontier/world-contracts) repo and docs.

---

## Prerequisites

- Git, Node.js, Sui CLI (or use the [Docker environment](../docker/readme.md))

---

## Quick start (deploy + seed resources)

Assumes `world-contracts` and `builder-scaffold` are sibling directories; adjust paths if your layout differs.

> **Coming soon:** These manual steps (clone, deploy, configure, seed, copy artifacts) will be simplified into a single setup command. Move package dependencies will resolve automatically using [MVR](https://docs.sui.io/guides/developer/packages/move-package-management).

### 1. Clone and deploy the world

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
mkdir -p ../builder-scaffold/deployments/
cp contracts/world/Pub.localnet.toml ../builder-scaffold/deployments/Pub.localnet.toml
cp -r deployments/* ../builder-scaffold/deployments/
cp test-resources.json ../builder-scaffold/test-resources.json
```

- `deployments/<network>/extracted-object-ids.json` — world package ID and shared object IDs
- `test-resources.json` — item IDs used to derive on-chain object IDs. Read more about object id derivation [here](https://docs.evefrontier.com/smart-contracts/object-model)

---

## Next steps

- [Move contracts](../move-contracts/readme.md) — build and publish your extension (e.g. `smart_gate`)
- [TypeScript scripts](../ts-scripts/readme.md) — authorize and run scripts against the seeded resources
