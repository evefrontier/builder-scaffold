# Move contracts

Build custom contracts to change the default behaviour of Smart Assemblies. You can build, test, and publish packages.

Examples for extending EVE Frontier Smart Assemblies by defining a typed struct in a custom contract and calling the extendable world functions:

- [Smart Gate extension example](./smart_gate_extension/)


More standalone contracts (multisig, token, DAO) will be added.

See [typed witness pattern](https://github.com/evefrontier/world-contracts/blob/main/docs/architechture.md#layer-3-player-extensions-moddability) to understand how to extend the EVE Frontier world.

## Prerequisites

- Sui CLI or [Docker](../docker/readme.md)
- [Deployed world](../docs/setup-world.md)

## World package setup

Extensions depend on the [world-contracts](https://github.com/evefrontier/world-contracts) package. For **localnet**, you deploy world yourself; for **testnet/devnet**, you integrate with whatever is already deployed.

**Pinning world-contracts version (local only):**

- **Local path** (default in Move.toml): The extension uses whatever is checked out in your world-contracts clone. To pin: `cd world-contracts && git checkout <branch|tag|SHA>` before deploying. This is the manual equivalent of setting `WORLD_CONTRACTS_BRANCH` / `WORLD_CONTRACTS_COMMIT` in `.env`.
- **Optional config:** Set `WORLD_CONTRACTS_BRANCH` (default `main`) and `WORLD_CONTRACTS_COMMIT` (optional; defaults to latest on branch) in `.env`, then run `./scripts/setup-world.sh` to checkout, deploy, and copy artifacts in one step.

## Build and publish (e.g. smart_gate_extension)

Custom contracts depend on the world contract being published on either local or testnet.

> **Redeploying?** If you're republishing after restarting localnet or switching branches, run `pnpm rebuild-world` from the repo root first. This refreshes `Pub.localnet.toml` and clears stale deployment artifacts.

### Option A: Using a publish script (recommended)

From the repo root, use the `pnpm publish-*` script for your extension. It publishes the package **and** writes all IDs to `extracted-object-ids.json` automatically — no `.env` update needed:

```bash
pnpm publish-smart-gate-extension
```

For your own custom extension, use one of the existing publish scripts in `ts-scripts/` as a template. Then run the [TypeScript scripts](../ts-scripts/readme.md) in order. Full step-by-step: [Docker flow](../docs/builder-flow-docker.md) or [Host flow](../docs/builder-flow-host.md).

### Option B: Manual publish

> Using `sui client publish` directly means `extracted-object-ids.json` won't be populated — you must set the relevant package ID variables (e.g. `GATE_EXTENSION_PACKAGE_ID`) in `.env` manually.

**Localnet** — resolve the world package address via the ephemeral pubfile:

```bash
cd move-contracts/smart_gate_extension
sui client test-publish --build-env testnet --pubfile-path ../../deployments/localnet/Pub.localnet.toml
```

> Assumes `Pub.localnet.toml` was copied to `deployments/localnet/` by `setup-world`. See the builder-flow docs for details.

**Testnet** — world package is resolved automatically:

```bash
cd move-contracts/smart_gate_extension
sui move build -e testnet
sui client publish -e testnet
```

For more details see [package management](https://docs.sui.io/guides/developer/packages/move-package-management).

## Formatting and linting

From repo root:

```bash
pnpm fmt          # format Move files
pnpm fmt:check    # check formatting (CI)
pnpm lint         # build + Move linter
```
