# Builder flow: Docker

Run the full builder-scaffold flow entirely inside Docker — no Sui tools needed on your host. The same steps work for any extension example (**smart_gate_extension**, **storage_unit_extension**, or your own); this guide uses **smart_gate_extension** for the publish and run-scripts steps.

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

**Bind mount:** `/workspace/world-contracts/` in the container is a bind mount of `docker/world-contracts/` on your host. Whatever branch you have checked out there is what gets deployed. Files persist across restarts and are editable from your IDE.

### Option A: Automated (recommended)

Use `pnpm setup-world-with-version` to pin a specific branch/commit, deploy, and copy artifacts in one step. See [setup-world-with-version](#setup-world-with-version-script) below.

### Option B: Manual

If you prefer not to use the script, clone (or ensure `docker/world-contracts` exists for the bind mount), then:

```bash
cd /workspace/world-contracts
git clone https://github.com/evefrontier/world-contracts.git .   # if empty
git checkout feature/extension-for-owned   # or your target branch
/workspace/builder-scaffold/docker/scripts/generate-world-env.sh   # creates .env from docker/.env.sui keys (if available)
pnpm install
pnpm deploy-world localnet       # or testnet
pnpm configure-world localnet    # or testnet
pnpm create-test-resources localnet   # or testnet
```

### setup-world-with-version script

The script ensures the world you deploy matches the version your extensions build against. It:

1. **Clones** world-contracts to `WORLD_CONTRACTS_DIR` if it doesn't exist (or the directory is empty)
2. **Checkouts** `WORLD_CONTRACTS_BRANCH` (and optionally `WORLD_CONTRACTS_COMMIT`) in `.env`
3. **Creates** world-contracts `.env` from `docker/.env.sui` when missing (first run after clone)
4. **Deploys** to the local node (or testnet if configured)
5. **Copies** `deployments/`, `test-resources.json`, `Pub.localnet.toml` into builder-scaffold

**With the bind mount:** The script operates on `WORLD_CONTRACTS_DIR` (default `../world-contracts`). Inside the container, that resolves to `/workspace/world-contracts`. If the bind mount is empty, the script clones into it. Run from builder-scaffold root:

```bash
cd /workspace/builder-scaffold
# Set in .env: WORLD_CONTRACTS_BRANCH=feature/extension-for-owned
# Optional: WORLD_CONTRACTS_DIR=/workspace/world-contracts (needed if default path differs)
pnpm setup-world-with-version
```

The script checks out the branch in the bind-mounted directory, then deploys from it. The container and host both see the same updated clone.

**Clean rebuild (new branch/commit):** Run `pnpm rebuild-world` or `pnpm setup-world-with-version --clean` to remove stale artifacts before deploy. For a fully fresh localnet, restart the container first.

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

Pick an example (e.g. **smart_gate_extension** or **storage_unit_extension**); use its folder in `move-contracts/`:

```bash
cd /workspace/builder-scaffold/move-contracts/smart_gate_extension   # or storage_unit_extension, or your package
sui client test-publish --build-env testnet --pubfile-path ../../deployments/localnet/Pub.localnet.toml  # localnet
sui client publish --build-env testnet   # testnet
```

Set `GATE_EXTENSION_PACKAGE_ID` and `GATE_EXTENSION_CONFIG_ID` in `/workspace/builder-scaffold/.env` from the publish output (or run `pnpm publish-smart-gate-extension` to capture them automatically).

## 9. Run scripts

For the **smart_gate_extension** example (scripts are in the repo root):

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
| Clean rebuild world | `pnpm rebuild-world` or `pnpm setup-world-with-version --clean` |
| Build a contract | `cd /workspace/builder-scaffold/move-contracts/<example> && sui move build -e testnet` |

See [docker/readme.md](../docker/readme.md) for container setup details, rebuilding, cleanup, and troubleshooting.
