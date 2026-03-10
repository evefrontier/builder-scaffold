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

This deploys the in-game setup (Smart Character, Network Node, Storage Unit, two Smart Gates) so you have real on-chain objects to build against.

**Run** (from builder-scaffold root):

```bash
cd builder-scaffold
pnpm setup-world
```

- The script checks out the stable world-contracts version that builder-scaffold is tested against (defaults: localnet, stable tag). 
- To test bleeding-edge features, override the world version in `.env` — set `WORLD_CONTRACTS_REF` to a branch or commit (see `.env.example`). You can also set `SUI_NETWORK`; for repo URL or clone path see `WORLD_CONTRACTS_REPO` and `WORLD_CONTRACTS_DIR` in `.env.example`.

**Clean and rebuild:** 

- After a chain reset or world ref change: `pnpm rebuild-world`, or `pnpm clean-world` then `pnpm setup-world`. 
- Use `pnpm clean-world -- --all` to remove all of `deployments/` and `test-resources.json`.

<a id="publish-custom-contract"></a>

## Publish custom contract

Use any example (e.g. **smart_gate_extension** or **storage_unit_extension**) from `move-contracts/`:

```bash
cd move-contracts/smart_gate_extension   # or storage_unit_extension, or your package
```

- **Localnet:**  
  `sui client test-publish --build-env testnet --pubfile-path ../../deployments/localnet/Pub.localnet.toml`
- **Testnet:**  
  `sui client publish -e testnet`

Note the publish output; you will set `BUILDER_PACKAGE_ID` and `EXTENSION_CONFIG_ID` in `.env` in the next step.

<a id="configure-builder-scaffold-env"></a>

## Configure builder-scaffold .env

```bash
cd /workspace/builder-scaffold/
cp .env.example .env
```

Set in `.env`:

- Same keys/addresses as used for world deployment
- `SUI_NETWORK=testnet` or `localnet`
- `WORLD_PACKAGE_ID` — from `deployments/<network>/extracted-object-ids.json` (`world.packageId`)
- `BUILDER_PACKAGE_ID` and `EXTENSION_CONFIG_ID` — from the publish output (previous step)

<a id="run-scripts"></a>

## Interact with Custom Contract

From **builder-scaffold** root (e.g. for **smart_gate_extension**):

<!-- TODO: You can add references to additional example scripts when they're available -->

```bash
# builder-scaffold root if you were in move-contracts/smart_gate_extension
pnpm install
pnpm configure-rules
pnpm authorise-gate-extension
pnpm authorise-storage-unit-extension
pnpm issue-tribe-jump-permit
pnpm jump-with-permit
pnpm collect-corpse-bounty
```
