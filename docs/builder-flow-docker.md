# Builder flow: Docker

Run the full builder-scaffold flow entirely inside Docker — no Sui tools needed on your host. The same steps work for any extension example (**smart_gate**, **storage_unit**, or your own); this guide uses **smart_gate** for the publish and run-scripts steps.

## 1. Prerequisites

- [Docker](https://docs.docker.com/get-docker/) installed

## 2. Clone builder-scaffold (if needed)

If you haven’t already, run the [common clone step](../README.md#quickstart) from the main README:

```bash
mkdir -p workspace && cd workspace
git clone https://github.com/evefrontier/builder-scaffold.git
cd builder-scaffold
```

## 3. Start the container

```bash
cd docker
docker compose run --rm --service-ports sui-dev
```

On first run the container creates three funded accounts (`ADMIN`, `PLAYER_A`, `PLAYER_B`). Keys persist across container restarts. Every start spins up a fresh local node and funds the accounts.

Inside the container you have:

```
/workspace/
├── builder-scaffold/    # full repo (syncs with host)
└── world-contracts/     # bind mount — clone here (syncs with host)
```

## 4. Switch to testnet (optional)

You can use testnet the same way you would on your host

```bash
sui client switch --env testnet
sui keytool import <your-private-key> ed25519
sui client faucet
```

<a id="deploy-world-and-create-test-resources"></a>

## 5. Deploy world and create test resources

> **Coming soon:** These manual steps (clone, deploy, configure, seed, copy artifacts) will be simplified into a single setup command. Move package dependencies will resolve automatically using [MVR](https://docs.sui.io/guides/developer/packages/move-package-management).

```bash
cd /workspace/world-contracts
git clone https://github.com/evefrontier/world-contracts.git .
/workspace/scripts/generate-world-env.sh   # creates .env from docker/.env.sui keys
pnpm install
pnpm deploy-world localnet       # or testnet
pnpm configure-world localnet    # or testnet
pnpm create-test-resources localnet   # or testnet
```

> The `/workspace/world-contracts/` directory is a bind mount at `docker/world-contracts/` on your host, so files persist across restarts and are editable from your IDE.

## 6. Copy world artifacts into builder-scaffold

```bash
NETWORK=localnet   # or testnet
mkdir -p /workspace/builder-scaffold/deployments/$NETWORK/
cp -r deployments/* /workspace/builder-scaffold/deployments/
cp test-resources.json /workspace/builder-scaffold/test-resources.json
cp "contracts/world/Pub.localnet.toml" "/workspace/builder-scaffold/deployments/localnet/Pub.localnet.toml"
```

## 7. Configure builder-scaffold .env

```bash
cd /workspace/builder-scaffold
cp .env.example .env
```

Set the following in `.env`:
- Same keys/addresses used during world deployment
- `SUI_NETWORK=testnet` (or `localnet`)
- `WORLD_PACKAGE_ID` — from `deployments/<network>/extracted-object-ids.json` (`world.packageId`)

## 8. Publish custom contract

Pick an example (e.g. **smart_gate** or **storage_unit**); use its folder in `move-contracts/`:

```bash
cd /workspace/builder-scaffold/move-contracts/smart_gate   # or storage_unit, or your package
sui client test-publish --build-env testnet --pubfile-path ../../deployments/localnet/Pub.localnet.toml  # localnet
sui client publish --build-env testnet   # testnet
```

Set `BUILDER_PACKAGE_ID` and `EXTENSION_CONFIG_ID` in `/workspace/builder-scaffold/.env` from the publish output.

## 9. Run scripts

For the **smart_gate** example (scripts are in the repo root):

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
| View keys | `cat /workspace/builder-scaffold/docker/.env.sui` |
| List addresses | `sui client addresses` |
| Switch network | `sui client switch --env testnet` |
| Import a key | `sui keytool import <key> ed25519` |
| Build a contract | `cd /workspace/builder-scaffold/move-contracts/<example> && sui move build -e testnet` |

See [docker/readme.md](../docker/readme.md) for container setup details, rebuilding, cleanup, and troubleshooting.
