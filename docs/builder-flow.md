# Builder flow

End-to-end flow to test builder-scaffold against world-contracts.

**Choose one path, then follow that guide’s steps from start to finish:**

| Choice | Guide | When to use it |
|--------|--------|----------------|
| **Docker** | [builder-flow-docker.md](./builder-flow-docker.md) | No Sui/Node on your machine; run everything in a container (local or testnet). |
| **Host** | [builder-flow-host.md](./builder-flow-host.md) | Sui CLI and Node.js on your machine; target local or testnet from the host. |

**Path convention:** Ensure **world-contracts** is a sibling of **builder-scaffold** in your workspace (e.g. `workspace/world-contracts` and `workspace/builder-scaffold` on host, or `/workspace/world-contracts` and `/workspace/builder-scaffold` in Docker). All commands use paths relative to that layout.

---

<a id="deploy-world-and-create-test-resources"></a>

## Deploy world and create test resources

> **Coming soon:** These manual steps will be simplified into a single setup command. Move package dependencies will resolve automatically using [MVR](https://docs.sui.io/guides/developer/packages/move-package-management).

From your workspace directory (parent of `builder-scaffold`), clone world-contracts and deploy:

```bash
cd ..   # workspace (parent of builder-scaffold)
git clone -b v0.0.14 https://github.com/evefrontier/world-contracts.git
cd world-contracts
```

- **Docker:** Run `/workspace/scripts/generate-world-env.sh` to create `.env` from the container keys (see [docker/readme.md](../docker/readme.md)).
- **Host:** `cp env.example .env` and set `SUI_NETWORK`, keys, and addresses (ADMIN, SPONSOR, etc.).

Then:

```bash
pnpm install
pnpm deploy-world localnet    # or testnet
pnpm configure-world localnet # or testnet
pnpm create-test-resources localnet   # or testnet
```

<a id="copy-world-artifacts-into-builder-scaffold"></a>

## Copy world artifacts into builder-scaffold

```bash
NETWORK=localnet   # or testnet
mkdir -p ../builder-scaffold/deployments/$NETWORK/
cp -r deployments/* ../builder-scaffold/deployments/
cp test-resources.json ../builder-scaffold/test-resources.json
cp "contracts/world/Pub.localnet.toml" "../builder-scaffold/deployments/localnet/Pub.localnet.toml"
```

<a id="configure-builder-scaffold-env"></a>

## Configure builder-scaffold .env

```bash
cd ../builder-scaffold
cp .env.example .env
```

Set in `.env`:

- Same keys/addresses as used for world deployment
- `SUI_NETWORK=testnet` or `localnet`
- `WORLD_PACKAGE_ID` — from `deployments/<network>/extracted-object-ids.json` (`world.packageId`)

<a id="publish-custom-contract"></a>

## Publish custom contract

Use any example (e.g. **smart_gate** or **storage_unit**) from `move-contracts/`:

```bash
cd move-contracts/smart_gate   # or storage_unit, or your package
```

- **Localnet:**  
  `sui client test-publish --build-env testnet --pubfile-path ../../deployments/localnet/Pub.localnet.toml`
- **Testnet:**  
  `sui client publish -e testnet`

Set `BUILDER_PACKAGE_ID` and `EXTENSION_CONFIG_ID` in `builder-scaffold/.env` from the publish output.

<a id="run-scripts"></a>

## Interact with Custom Contract

From **builder-scaffold** root (e.g. for **smart_gate**):

<!-- TODO: You can add references to additional example scripts when they're available -->

```bash
cd ..   # builder-scaffold root if you were in move-contracts/smart_gate
pnpm install
pnpm configure-rules
pnpm authorise-gate
pnpm authorise-storage-unit
pnpm issue-tribe-jump-permit
pnpm jump-with-permit
pnpm collect-corpse-bounty
```
