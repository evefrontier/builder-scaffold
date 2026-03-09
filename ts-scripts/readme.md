# TypeScript scripts

Interact with your deployed extension contracts from TypeScript.

## Prerequisites

1. World contracts deployed and configured (see [setup-world](../setup-world/readme.md)), or you're building on an existing world — [building-on-existing-world](../docs/building-on-existing-world.md) guide (coming soon)
2. In both cases: `deployments/` and `test-resources.json` for that world copied to this repo's root
3. Your extension package published (e.g. `smart_gate`)

## Setup

```bash
# From repo root
cp .env.example .env    # fill in keys, WORLD_PACKAGE_ID, BUILDER_PACKAGE_ID
pnpm install
```

Set `WORLD_PACKAGE_ID`, `BUILDER_PACKAGE_ID`, and other environment variables in `.env` from your extension package deployment output.

For the Smart Gate example script order, see [smart_gate/readme.md](./smart_gate/readme.md).

## Customization

- Edit `test-resources.json` to change item IDs, type IDs, or location hash
- Object IDs are derived at runtime from `test-resources.json` + `extracted-object-ids.json` using `deriveObjectId()`

## Adding your own scripts

Use the existing scripts as templates. The key utilities:

- `utils/helper.ts` — env config, context initialization, world config hydration
- `utils/derive-object-id.ts` — derive Sui object IDs from game item IDs
- `utils/proof.ts` — generate location proofs for proximity verification
- `helpers/` — query OwnerCap objects for gates, storage units, characters
