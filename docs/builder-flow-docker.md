# Builder flow: Docker

Run the full builder-scaffold flow entirely inside Docker — no Sui tools needed on your host. The same steps work for any extension example (**smart_gate_extension**, **storage_unit_extension**, or your own); this guide uses **smart_gate_extension** for the publish and run-scripts steps.

## 1. Prerequisites

- [Docker](https://docs.docker.com/get-docker/) installed

## 2. Clone builder-scaffold (if needed)

If you haven’t already, run the [common clone step](../README.md#quickstart) from the main README:

> **Check the latest stable tag** before cloning: [github.com/evefrontier/world-contracts/tags](https://github.com/evefrontier/world-contracts/tags)  
> Substitute `<latest-tag>` with the most recent tag (e.g. `v0.0.15`).

```bash
mkdir -p workspace && cd workspace
git clone -b <latest-tag> https://github.com/evefrontier/builder-scaffold.git
cd builder-scaffold
```

## 3. Start the container

```bash
cd docker
docker compose run --rm --service-ports sui-dev
```

On first run the container creates four funded accounts (`ADMIN`, `PLAYER_A`, `PLAYER_B`, `PLAYER_C`) and writes their keys to `docker/.env.sui`. Keys are stored in the `sui-config` named Docker volume and **persist across container restarts**.

To regenerate keys (full fresh start), remove the volume first:

```bash
docker compose down -v   # removes the sui-config volume — wipes keys and node state
docker compose run --rm --service-ports sui-dev   # new keys generated, new .env.sui written
```

> **After `down -v`:** The new container starts a fresh chain with a new chain ID. You must use `pnpm rebuild-world` (not bare `setup-world`) — it removes the entire `deployments/localnet/` directory first, clearing `extracted-object-ids.json`, `runtime-object-ids.json`, and `seed-resources.json`. Without this, stale IDs from the previous chain survive and cause errors like `dynamic_field::borrow_child_object_mut abort code 1`.
> 1. Update `.env` with the new keys/addresses from `docker/.env.sui`
> 2. Run `pnpm rebuild-world` — clears all stale artifacts, redeploys world, and re-runs `pnpm seed`
> 3. Re-publish all extensions and re-create runtime objects (`pnpm create-marketplace`, `pnpm create-supply-unit`, etc.)

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

Use `pnpm setup-world` to pin a specific branch/commit, deploy, and copy artifacts in one step.

The script:

1. **Clones** world-contracts to `WORLD_CONTRACTS_DIR` if it doesn't exist (or the directory is empty)
2. **Checkouts** `WORLD_CONTRACTS_BRANCH` (default `main`) in `.env`; if `WORLD_CONTRACTS_COMMIT` is also set it takes precedence — accepts a commit SHA or a tag (e.g. `v0.0.15`; see [tags](https://github.com/evefrontier/world-contracts/tags))
3. **Creates** world-contracts `.env` from `docker/.env.sui` when missing (first run after clone)
4. **Deploys** to the local node (or testnet if configured)
5. **Copies** `deployments/`, `test-resources.json`, `Pub.localnet.toml` into builder-scaffold

The script operates on `WORLD_CONTRACTS_DIR` (default `../world-contracts`). Inside the container, that resolves to `/workspace/world-contracts`. If the bind mount is empty, the script clones into it. Run from builder-scaffold root:

```bash
cd /workspace/builder-scaffold
# WORLD_CONTRACTS_BRANCH defaults to main — change to pin a different branch
# WORLD_CONTRACTS_COMMIT=v0.0.15  # optional: pin to a tag or SHA (check https://github.com/evefrontier/world-contracts/tags)
# Optional: WORLD_CONTRACTS_DIR=/workspace/world-contracts (needed if default path differs)
pnpm setup-world
```

The script checks out the branch in the bind-mounted directory, then deploys from it. The container and host both see the same updated clone.

**Clean rebuild (new branch/commit):** Run `pnpm rebuild-world` or `pnpm setup-world --clean` to remove stale artifacts before deploy. For a fully fresh localnet, restart the container first.

### Option B: Manual

The bind mount (`docker/world-contracts/` on your host ↔ `/workspace/world-contracts` in the container) must be populated before deploying. If it's empty, clone world-contracts into it first — do this **on your host**:

```bash
# On your host (outside the container):
cd builder-scaffold/docker
git clone https://github.com/evefrontier/world-contracts.git world-contracts
```

> Check the [latest stable tag](https://github.com/evefrontier/world-contracts/tags) and checkout a pinned version if needed:
> ```bash
> cd docker/world-contracts
> git checkout v0.0.15   # or any tag/SHA
> ```

Then inside the container (or on the host with sui client pointing at the local node), deploy:

```bash
cd /workspace/world-contracts
git checkout main          # branch — equivalent to WORLD_CONTRACTS_BRANCH=main in .env
# or: git checkout v0.0.15  # tag   — equivalent to WORLD_CONTRACTS_COMMIT=v0.0.15 in .env
# or: git checkout abc1234  # SHA   — equivalent to WORLD_CONTRACTS_COMMIT=abc1234 in .env
/workspace/builder-scaffold/docker/scripts/generate-world-env.sh   # creates .env from docker/.env.sui keys
pnpm install
pnpm deploy-world localnet       # or testnet
pnpm configure-world localnet    # or testnet
pnpm create-test-resources localnet   # or testnet
```

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
- `SUI_NETWORK=localnet` (or `testnet`)
- `WORLD_CONTRACTS_BRANCH` (default `main`) — set if targeting a different branch; read by `pnpm setup-world` / `rebuild-world` to know which branch to checkout
- `WORLD_CONTRACTS_COMMIT` — optional; set to a tag (e.g. `v0.0.15`) or SHA to pin a specific release; takes precedence over the branch tip when set. Required for `rebuild-world` to consistently re-deploy the same version

All package IDs and object IDs (`WORLD_PACKAGE_ID`, `GATE_EXTENSION_PACKAGE_ID`, `MARKETPLACE_ID`, etc.) are **auto-read from the deployment files** — no manual `.env` updates needed:
- `deployments/<network>/extracted-object-ids.json` — populated by `setup-world` and each `pnpm publish-*` script
- `deployments/<network>/runtime-object-ids.json` — populated by `pnpm create-marketplace` / `create-supply-unit`
- `deployments/<network>/seed-resources.json` — populated by `pnpm seed` (runs automatically via `setup-world`); tracks local seeding state

Set a variable in `.env` only if you need to override the file-based value.

## 8. Publish custom contract

### Option A: Using a publish script (recommended)

The example publish scripts (`pnpm publish-smart-gate-extension`, `pnpm publish-storage-unit-extension`, etc.) publish the package **and** automatically write all IDs to `extracted-object-ids.json`. All downstream scripts read from this file — no `.env` update needed.

**For your own custom extension, follow the same pattern:** copy one of the existing publish scripts in `ts-scripts/` as a template, update the package path and ID extraction logic, and call it via a new `pnpm` script in `package.json`.

```bash
cd /workspace/builder-scaffold
pnpm publish-smart-gate-extension       # or publish-storage-unit-extension, publish-currency-token, etc.
```

### Option B: Manual publish

You can publish directly with the Sui CLI, but **`extracted-object-ids.json` will not be populated** — you must manually set the relevant `.env` variables (e.g. `GATE_EXTENSION_PACKAGE_ID`) for all depedent scripts to find the package.

> This approach is not recommended for the example flows. Use it only if you have a reason to bypass the publish script method.

```bash
# localnet
cd /workspace/builder-scaffold/move-contracts/smart_gate_extension
sui client test-publish --pubfile-path ../../deployments/localnet/Pub.localnet.toml

# testnet
sui client publish --gas-budget 100000000
```

Then manually add the published package ID to `.env`:
```
GATE_EXTENSION_PACKAGE_ID=0x...
```

## 9. Run scripts

For the **smart_gate_extension** example (scripts are in the repo root):

```bash
cd /workspace/builder-scaffold
pnpm install
pnpm configure-rules
pnpm authorise-gate
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
| Clean rebuild world | `pnpm rebuild-world` or `pnpm setup-world --clean` |
| Build a contract | `cd /workspace/builder-scaffold/move-contracts/<example> && sui move build -e testnet` |

See [docker/readme.md](../docker/readme.md) for container setup details, rebuilding, cleanup, and troubleshooting.
