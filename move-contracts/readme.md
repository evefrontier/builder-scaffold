# Move contracts

Build custom contracts to change the default behaviour of Smart Assemblies. You can build, test, and publish packages.

Examples for extending EVE Frontier Smart Assemblies by defining a typed struct in a custom contract and calling the extendable world functions:

- [Smart Gate example](./smart_gate/)
- [Smart Storage Unit example](./storage_unit/)
<!-- - [Smart Turret example](./turret/) -->

More standalone contracts (multisig, token, DAO) will be added.

See [typed witness pattern](https://github.com/evefrontier/world-contracts/blob/main/docs/architechture.md#layer-3-player-extensions-moddability) to understand how to extend the EVE Frontier world.

## Prerequisites

- Sui CLI or [Docker](../docker/readme.md)
- [Deployed world](../setup-world/readme.md)

## Build and publish (e.g. smart_gate)

Custom contracts depend on the world contract being published on either local or testnet.

**Testnet**

On testnet the published world package is automatically resolved when deploying the custom contract:

```bash
cd move-contracts/smart_gate
sui move build -e testnet
```

**Local**

Since the local network is short-lived, you need to manually resolve to the published world package address by providing the path to the published ephemeral file:

```bash
cd move-contracts/smart_gate
sui client publish --build-env testnet --pubfile-path ../../../world-contracts/contracts/world/Pub.localnet.toml
```

> **Note:** This assumes `world-contracts` and `builder-scaffold` are sibling directories. Adjust the path if your layout differs.

For more details see [package management](https://docs.sui.io/guides/developer/packages/move-package-management).

**In Docker:** contracts are at `/workspace/builder-scaffold/move-contracts/`. From inside the container you can publish the same way on either local or testnet.

From the publish output, set `BUILDER_PACKAGE_ID` and `EXTENSION_CONFIG_ID` in the repo `.env`. Then run the [TypeScript scripts](../ts-scripts/readme.md) in order. Full flow: [docs/builder-flow.md](../docs/builder-flow.md).

## Formatting and linting

From repo root:

```bash
pnpm fmt          # format Move files
pnpm fmt:check    # check formatting (CI)
pnpm lint         # build + Move linter
```
