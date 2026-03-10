# Move contracts

Build custom contracts to change the default behaviour of Smart Assemblies. You can build, test, and publish packages.

Examples for extending EVE Frontier Smart Assemblies by defining a typed struct in a custom contract and calling the extendable world functions:

- [Smart Gate example](./smart_gate_extension/)
- [Smart Storage Unit Extension example](./storage_unit_extension/)
<!-- - [Smart Turret example](./turret/) -->

See [typed witness pattern](https://github.com/evefrontier/world-contracts/blob/main/docs/architechture.md#layer-3-player-extensions-moddability) to understand how to extend the EVE Frontier world.

## Prerequisites

- Sui CLI or [Docker](../docker/readme.md)
- [Deployed world](../setup-world/readme.md)

## Build and publish (e.g. smart_gate_extension)

### Build

```bash
cd move-contracts/smart_gate_extension
sui move build -e testnet
```

### Publish

Some custom contracts depend on the world contract being published on either local or testnet. Commands below assume you are in the package directory (e.g. `move-contracts/smart_gate_extension` from repo root).

**Testnet**

On testnet the published world package is automatically resolved when deploying the custom contract:

```bash
cd move-contracts/smart_gate_extension   # from repo root
sui client publish -e testnet
```

**Local**

Since the local network is short-lived, you need to manually resolve to the published world package address by providing the path to the published ephemeral file:

> **Note:** If the contracts depend on the world package, deploy the world first (see [builder-flow](../docs/builder-flow.md) or the flow docs below).

```bash
cd move-contracts/smart_gate_extension   # from repo root
sui client test-publish --build-env testnet --pubfile-path ../../deployments/localnet/Pub.localnet.toml
```

> **Why `-e testnet` even for local builds?** The localnet chain ID changes on every restart, so you can't pin it in `Move.toml`. Using testnet as the build environment resolves dependencies correctly while publishing to your local node via [ephemeral publication](https://docs.sui.io/guides/developer/packages/move-package-management#test-publish).

> **Note:** This assumes `Pub.localnet.toml` was copied to `deployments/localnet/` during the artifact copy step.

**In Docker:** contracts are at `/workspace/builder-scaffold/move-contracts/`. Build and publish the same way (local or testnet) from inside the container.

After publishing, set the package/extension IDs in the repo `.env` and run the [TypeScript scripts](../ts-scripts/readme.md). Full step-by-step: [Docker flow](../docs/builder-flow-docker.md) or [Host flow](../docs/builder-flow-host.md). See also [package management](https://docs.sui.io/guides/developer/packages/move-package-management).

## Extension caveats

- **One extension per gate** — A gate has a single extension slot; attaching a new one replaces the previous (e.g. `swap_or_fill` behavior).

- **TypeName includes package ID** — Redeploying your extension (new package ID) changes the type; existing auth/configuration that references the old type will break. Re-run `authorise-gate-extension` and `authorise-storage-unit-extension` and update any stored config after a redeploy.

## Formatting and linting

From repo root:

```bash
pnpm fmt          # format Move files
pnpm fmt:check    # check formatting (CI)
pnpm lint         # build + Move linter
```
