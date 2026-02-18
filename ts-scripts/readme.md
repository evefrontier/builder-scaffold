# TypeScript Scripts

Interact with your deployed extension contracts from TypeScript.

## Prerequisites

1. World contracts deployed and configured (see [setup-world](../setup-world/readme.md))
2. `deployments/` and `test-resources.json` copied to this repo's root
3. Your extension package published (e.g. `smart_gate`)

## Setup

```bash
# From repo root
cp .env.example .env    # fill in keys, WORLD_PACKAGE_ID, BUILDER_PACKAGE_ID
pnpm install
```

Set `WORLD_PACKAGE_ID`, `BUILDER_PACKAGE_ID` and other evironment variables needed in `.env` from your extension pacakge deployment output.

## Example Interaction with custom Smart Gate

After publishing `move-contracts/smart_gate/`, run the scripts in order:

```bash
# 1. Configure extension rules (tribe config + bounty config)
pnpm configure-rules

# 2. Authorize the extension on gates and storage unit
pnpm authorise-gate
pnpm authorise-storage-unit

# 3. Issue a jump permit (tribe-based) (Ideally this happens in a dapp)
pnpm issue-tribe-jump-permit

# 4. Jump using the permit (Ideally this happens in the game UI)
pnpm jump-with-permit

# 5. Collect corpse bounty for a jump permit
pnpm collect-corpse-bounty
```

## Customization

- Edit `test-resources.json` to change item IDs, type IDs, or location hash
- Object IDs are derived at runtime from `test-resources.json` + `extracted-object-ids.json` using `deriveObjectId()`

## Adding your own scripts

Use the existing scripts as templates. The key utilities:

- `utils/helper.ts` -- env config, context initialization, world config hydration
- `utils/derive-object-id.ts` -- derive Sui object IDs from game item IDs
- `utils/proof.ts` -- generate location proofs for proximity verification
- `helpers/` -- query OwnerCap objects for gates, storage units, characters
