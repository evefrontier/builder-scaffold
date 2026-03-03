# Move contracts

Build custom contracts to change the default behaviour of Smart Assemblies. You can build, test, and publish packages.

Examples for extending EVE Frontier Smart Assemblies by defining a typed struct in a custom contract and calling the extendable world functions:

- [Smart Gate extension example](./smart_gate_extension/)
- [Smart Storage Unit extension example](./storage_unit_extension/)
<!-- - [Smart Turret example](./turret/) -->

More standalone contracts (multisig, token, DAO) will be added.

See [typed witness pattern](https://github.com/evefrontier/world-contracts/blob/main/docs/architechture.md#layer-3-player-extensions-moddability) to understand how to extend the EVE Frontier world.

## Prerequisites

- Sui CLI or [Docker](../docker/readme.md)
- [Deployed world](../setup-world/readme.md)

## World package setup

Extensions depend on the [world-contracts](https://github.com/evefrontier/world-contracts) package. For **localnet**, you deploy world yourself; for **testnet/devnet**, you integrate with whatever is already deployed.

**Pinning world-contracts version (local only):**

- **Local path** (default in Move.toml): The extension uses whatever is checked out in your world-contracts clone. To pin: `cd world-contracts && git checkout <branch-or-commit>` before deploying.
- **Optional config:** Set `WORLD_CONTRACTS_BRANCH` (default `main`) and `WORLD_CONTRACTS_COMMIT` (optional; defaults to latest on branch) in `.env`, then run `./scripts/setup-world-with-version.sh` to checkout, deploy, and copy artifacts in one step.

## Build and publish (e.g. smart_gate_extension)

Custom contracts depend on the world contract being published on either local or testnet.

**Testnet**

On testnet the published world package is automatically resolved when deploying the custom contract:

```bash
cd move-contracts/smart_gate_extension
sui move build -e testnet
sui client publish -e testnet
```

**Local**

Since the local network is short-lived, you need to manually resolve to the published world package address by providing the path to the published ephemeral file:

> NOTE: If the contracts are dependant on the world pacakge, make sure the world is deployed first

```bash
cd move-contracts/smart_gate_extension
sui client test-publish --build-env testnet --pubfile-path ../../deployments/localnet/Pub.localnet.toml
```

> **Note:** This assumes `Pub.localnet.toml` was copied to `deployments/localnet/` during the artifact copy step. See the builder-flow docs for details.

> **Redeploying?** If you're republishing after restarting localnet or switching branches, run `pnpm rebuild-world` from the repo root first. This refreshes `Pub.localnet.toml` and clears stale deployment artifacts before you publish your extension.

For more details see [package management](https://docs.sui.io/guides/developer/packages/move-package-management).

**In Docker:** contracts are at `/workspace/builder-scaffold/move-contracts/`. From inside the container you can publish the same way on either local or testnet.

From the publish output, set `GATE_EXTENSION_PACKAGE_ID` and `GATE_EXTENSION_CONFIG_ID` in the repo `.env` (or run `pnpm publish-smart-gate-extension` to capture them automatically into `extracted-object-ids.json`). Then run the [TypeScript scripts](../ts-scripts/readme.md) in order. Full step-by-step: [Docker flow](../docs/builder-flow-docker.md) or [Host flow](../docs/builder-flow-host.md).

## Formatting and linting

From repo root:

```bash
pnpm fmt          # format Move files
pnpm fmt:check    # check formatting (CI)
pnpm lint         # build + Move linter
```
