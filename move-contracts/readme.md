https://github.com/evefrontier/world-contracts/blob/main/docs/architechture.md#layer-3-player-extensions-moddability# Move Contracts

You can build custom contracts to change the default behaviour of smart assemblies. You can build, test and publish packges. 

You can find examples for extendiing the eve frontier smart assembly by defining a Typed Struct in the custom contract and calling the extendable eve frontier world functions. 

See [Typed witness pattern](https://github.com/evefrontier/world-contracts/blob/main/docs/architechture.md#layer-3-player-extensions-moddability) to understand more on how to extend EVE frontier world 

<!-- TODO: add docs link here -->
[Smart Gate Example ](./smart_gate/) . See [smart-gate](./smart_gate/readme.md) 
[Smart Storage Unit Example](./storage_unit/)
[Smart Turret Example](./)

More standalone contracts like Multsig contract, token, DAO examples will be added.

## Prerequisites
- Sui Tools or Docker 
- [Deployed World](../setup-world/readme.md)

## Build and publish (e.g. smart_gate)

Custom contracts are dependant on the world contract to be publised on either local or testnet. 

**Testnet** 
In testnet the published world pacakage is automatically resolved when deploying the custom contract

```bash
cd move-contracts/smart_gate
sui move build -e testnet
```

**Local** 
Since local is a short lived, we need to manually link to the published world pacakge address by providing the path to the published ephemeral file <Pub.localnet.toml>

```bash
cd move-contracts/smart_gate
sui client test-publish --build-env testnet --pubfile-path ../../../world-contracts/contracts/world/Pub.localnet.toml
```

For more details refer [pacakage-deps](https://docs.sui.io/guides/developer/packages/move-package-management)


**In Docker:** contracts are mounted at `/workspace/contracts`. From inside the container, you can publish the same way either in local or testnet

From the publish output, set `BUILDER_PACKAGE_ID` and `EXTENSION_CONFIG_ID` in the repo `.env`. Then run the [TypeScript scripts](../ts-scripts/readme.md) in order. Full flow: [docs/builder-flow.md](../docs/builder-flow.md).

## Formatting & linting

From repo root:

```bash
pnpm fmt          # format Move files
pnpm fmt:check    # check formatting (CI)
pnpm lint         # build + Move linter
```
