# Move contracts

Build custom contracts to change the default behaviour of Smart Assemblies. You can build, test, and publish packages.

Examples for extending EVE Frontier Smart Assemblies by defining a typed struct in a custom contract and calling the extendable world functions:

- [Smart Gate example](./smart_gate_extension/)
- [Smart Storage Unit Extension example](./storage_unit_extension/)
<!-- - [Smart Turret example](./turret/) -->

See [typed witness pattern](https://github.com/evefrontier/world-contracts/blob/main/docs/architechture.md#layer-3-player-extensions-moddability) to understand how to extend the EVE Frontier world.

## Build

The world dependency is pinned in each `Move.toml` to the world-contracts commit that
records the live `@evefrontier/world` package. Liminality shares that package with
Stillness, so build with the `testnet_stillness` environment:

```bash
sui move build --path move-contracts/smart_gate_extension -e testnet_stillness
```

## Publish

Publish with `pnpm publish-extension` from the repo root, then sign in the
[zkLogin tool](../zklogin/readme.md). It builds the publish in TypeScript so the package is
published by — and its `UpgradeCap` sent to — your game account, rather than the Sui CLI's
own address. The CLI must be on testnet (`sui client switch --env testnet`), because the
bytecode dump fetches the world package from the network.

Full walkthrough: [building on an existing world](../docs/building-on-existing-world.md).

## Extension caveats

- **One extension per gate** — A gate has a single extension slot; attaching a new one replaces the previous (`swap_or_fill`).

- **Freezing is permanent** — `freeze_extension_config` locks an assembly to its current extension for good. Only freeze once the extension is final.

- **TypeName includes package ID** — Redeploying your extension (new package ID) changes the type; existing auth/configuration that references the old type will break. Re-run `pnpm setup-gate` after a redeploy.

## Formatting and linting

From repo root:

```bash
pnpm fmt          # format Move files
pnpm fmt:check    # check formatting (CI)
pnpm lint         # build + Move linter
```
