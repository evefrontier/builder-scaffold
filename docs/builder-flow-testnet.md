# Builder flow: Testnet

Test builder-scaffold (e.g. `smart_gate`) with a simulated world on **testnet**.

## 1. Prerequisites

- Sui CLI and Node.js on your host, or use [Docker](../docker/readme.md) and switch to testnet inside the container (same steps; run from repo root in container or mount builder-scaffold and use `/workspace`).
- Funded testnet accounts (e.g. from [Sui testnet faucet](https://faucet.sui.io/)).

## 2. Deploy world and create  test resources

```bash
mkdir -p hackathon
cd hackathon
git clone https://github.com/evefrontier/builder-scaffold.git
git clone https://github.com/evefrontier/world-contracts.git
cd world-contracts
cp env.example .env
# Set SUI_NETWORK=testnet and keys
# For developement, ADMIN_ADDRESS & SPONSOR_ADDRESS can be the same. GOVERNOR_PRIVATE_KEY can be optional or same as ADMIN_PRIVATE_KEY
pnpm install
pnpm deploy-world testnet
pnpm configure-world testnet
pnpm create-test-resources testnet
```

## 3. Copy world artifacts into builder-scaffold

```bash
rm -rf ../builder-scaffold/deployments/ 
cp -r deployments ../builder-scaffold/deployments
cp test-resources.json ../builder-scaffold/test-resources.json
```

## 4. Configure builder-scaffold .env

```bash
cd ../builder-scaffold
cp .env.example .env
```

Set: same keys/addresses as world-contracts, `SUI_NETWORK=testnet`, `SUI_RPC_URL` (default testnet RPC or leave unset), `WORLD_PACKAGE_ID` from `deployments/testnet/extracted-object-ids.json` (`world.packageId`).

## 4. Publish custom contract on testnet 

example smart-gate

```bash
cd move-contracts/smart_gate
sui move build -e testnet
sui client publish -e testnet
```

Set `BUILDER_PACKAGE_ID` and `EXTENSION_CONFIG_ID` in builder-scaffold `.env` from the publish output.

## 6. Run scripts

```bash
cd ..   # builder-scaffold root
pnpm install
pnpm configure-rules
pnpm authorise-gate
pnpm authorise-storage-unit
pnpm issue-tribe-jump-permit
pnpm jump-with-permit
pnpm collect-corpse-bounty
```

For localnet, see [builder-flow-local.md](./builder-flow-local.md).
