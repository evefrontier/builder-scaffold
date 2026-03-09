# Builder flow

End-to-end flow to test builder-scaffold against world-contracts.

- **Docker:** [builder-flow-docker.md](./builder-flow-docker.md) — full flow inside a container (local or testnet), no host tooling required.
- **Host:** [builder-flow-host.md](./builder-flow-host.md) — run on host with Sui CLI and Node.js installed (local or testnet).

The steps below are shared instructions for both flows: 

**Path convention:** Ensure **world-contracts** is a sibling of **builder-scaffold** in your workspace (e.g. `workspace/world-contracts` and `workspace/builder-scaffold` on host, or `/workspace/world-contracts` and `/workspace/builder-scaffold` in Docker). All commands use paths relative to that layout.

---

<a id="clone-builder-scaffold"></a>

## 1. Clone builder-scaffold (if needed)

See the main [README Quickstart](../README.md#quickstart):

```bash
mkdir -p workspace && cd workspace
git clone https://github.com/evefrontier/builder-scaffold.git
cd builder-scaffold
```

<a id="deploy-world-and-create-test-resources"></a>

## 2. Deploy world and create test resources

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

## 3. Copy world artifacts into builder-scaffold

```bash
NETWORK=localnet   # or testnet
mkdir -p ../builder-scaffold/deployments/$NETWORK/
cp -r deployments/* ../builder-scaffold/deployments/
cp test-resources.json ../builder-scaffold/test-resources.json
cp "contracts/world/Pub.localnet.toml" "../builder-scaffold/deployments/localnet/Pub.localnet.toml"
```

<a id="configure-builder-scaffold-env"></a>

## 4. Configure builder-scaffold .env

```bash
cd ../builder-scaffold
cp .env.example .env
```

Set in `.env`:

- Same keys/addresses as used for world deployment
- `SUI_NETWORK=testnet` or `localnet`
- `WORLD_PACKAGE_ID` — from `deployments/<network>/extracted-object-ids.json` (`world.packageId`)

<a id="publish-custom-contract"></a>

## 5. Publish custom contract

Use any example (e.g. **smart_gate** or **storage_unit**) from `move-contracts/`:

```bash
cd move-contracts/smart_gate   # or storage_unit, or your package
```

- **Localnet:**  
  `sui client test-publish --build-env testnet --pubfile-path ../../deployments/localnet/Pub.localnet.toml`
- **Testnet:**  
  `sui client publish --build-env testnet`

Set `BUILDER_PACKAGE_ID` and `EXTENSION_CONFIG_ID` in `builder-scaffold/.env` from the publish output.

<a id="run-scripts"></a>

## 6. Run scripts

From **builder-scaffold** root (e.g. for **smart_gate**):

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
