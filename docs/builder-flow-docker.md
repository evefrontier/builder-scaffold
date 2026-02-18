# Builder flow: Docker

Run the full builder-scaffold flow (e.g. `smart_gate`) entirely inside Docker — no Sui tools needed on your host.

## 1. Prerequisites

- [Docker](https://docs.docker.com/get-docker/) installed
- Funded testnet accounts for testnet flow (e.g. from [Sui testnet faucet](https://faucet.sui.io/))

## 2. Start the container

```bash
cd docker
docker compose run --rm sui-local
```

On first run the container starts a local node and creates three funded accounts (`ADMIN`, `PLAYER_A`, `PLAYER_B`). This takes a minute or two.

Inside the container you have:

```
/workspace/
├── builder-scaffold/    # full repo (syncs with host)
├── world-contracts/     # bind mount — clone here (syncs with host)
├── data/                # keys, .env.sui
├── docker/              # .env.testnet lives here
└── scripts/             # entrypoint + helpers
```

## 3. Switch to testnet (skip for localnet)

Create `docker/.env.testnet` on your host with your funded Bech32 keys:

```
ADMIN_PRIVATE_KEY=suiprivkey1...
PLAYER_A_PRIVATE_KEY=suiprivkey1...
PLAYER_B_PRIVATE_KEY=suiprivkey1...
```

Then inside the container:

```bash
./scripts/switch-network.sh testnet
```

## 4. Deploy world and create test resources

> **Coming soon:** These manual steps (clone, deploy, configure, seed, copy artifacts) will be simplified into a single setup command. Move package dependencies will resolve automatically using [MVR](https://docs.sui.io/guides/developer/packages/move-package-management).

```bash
cd /workspace/world-contracts
git clone https://github.com/evefrontier/world-contracts.git .
/workspace/scripts/generate-world-env.sh  # auto-creates .env from your keys
# Or edit docker/world-contracts/.env on your host — the directory syncs
pnpm install
pnpm deploy-world testnet       # or localnet
pnpm configure-world testnet    # or localnet
pnpm create-test-resources testnet   # or localnet
```

> The `/workspace/world-contracts/` directory is a bind mount at `docker/world-contracts/` on your host, so files persist across restarts and are editable from your IDE.

## 5. Copy world artifacts into builder-scaffold

```bash
cp -r deployments/* /workspace/builder-scaffold/deployments/
cp test-resources.json /workspace/builder-scaffold/test-resources.json
```

## 6. Configure builder-scaffold .env

```bash
cd /workspace/builder-scaffold
cp .env.example .env
```

Set the following in `.env`:
- Same keys/addresses used during world deployment
- `SUI_NETWORK=testnet` (or `localnet`)
- `WORLD_PACKAGE_ID` — from `deployments/<network>/extracted-object-ids.json` (`world.packageId`)

## 7. Publish custom contract

```bash
cd /workspace/builder-scaffold/move-contracts/smart_gate
sui client publish --build-env testnet #testnet 
sui client test-publish --build-env testnet --pubfile-path ../../../world-contracts/contracts/world/Pub.localnet.toml #localnet
```

Set `BUILDER_PACKAGE_ID` and `EXTENSION_CONFIG_ID` in `/workspace/builder-scaffold/.env` from the publish output.

## 8. Run scripts

```bash
cd /workspace/builder-scaffold
pnpm install
pnpm configure-rules
pnpm authorise-gate
pnpm authorise-storage-unit
pnpm issue-tribe-jump-permit
pnpm jump-with-permit
pnpm collect-corpse-bounty
```

## Useful commands

| Task | Command |
|------|---------|
| View keys | `cat /workspace/data/.env.sui` |
| Switch network | `./scripts/switch-network.sh localnet` or `testnet` |
| Build a contract | `cd /workspace/builder-scaffold/move-contracts/smart_gate && sui move build -e testnet` |

See [docker/readme.md](../docker/readme.md) for container setup details, rebuilding, cleanup, and troubleshooting.
