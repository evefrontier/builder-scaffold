# TypeScript scripts

Interact with your deployed extension contracts from TypeScript.

## Prerequisites

1. World contracts deployed and configured (see [setup-world](../docs/setup-world.md))
2. `deployments/` and `test-resources.json` copied to this repo's root
3. Your extension package published (e.g. `smart_gate_extension`)

> **Redeploying?** If you need to republish contracts (e.g. after switching branches or restarting localnet), run `pnpm rebuild-world` first. This clears stale artifacts and `Pub.localnet.toml` so publish scripts don't fail with "already published".

## Setup

```bash
# From repo root
cp .env.example .env    # fill in: SUI_NETWORK, keys, addresses, WORLD_CONTRACTS_BRANCH (+ optional WORLD_CONTRACTS_COMMIT to pin a tag)
pnpm install
```

All package IDs and object IDs are **auto-read from deployment files**:
- `deployments/<network>/extracted-object-ids.json` — written by `setup-world` and each `pnpm publish-*` script

Set a variable in `.env` only if you need to override a file-based value or if you prefer to refence the env for your scripts rather than the `extracted-object-ids.json`.

## Example: interact with custom Smart Gate

After publishing `move-contracts/smart_gate_extension/`, run the scripts in order:

```bash
# 1. Configure extension rules (tribe config + bounty config)
pnpm configure-rules

# 2. Authorize XAuth on gates + storage unit
pnpm authorise-gate

# 3. Issue a jump permit (tribe-based) — typically happens in a dApp
pnpm issue-tribe-jump-permit

# 4. Jump using the tribe permit — typically happens in the game UI
pnpm jump-with-permit

# 5. Collect corpse bounty for a jump permit
pnpm collect-corpse-bounty

# 6. Jump using the corpse bounty permit — typically happens in the game UI
pnpm jump-with-permit
```

## Customization

- `test-resources.json` is auto-synced from world-contracts by `setup-world` — do not edit it directly. Use `.env` to override individual IDs.
- Object IDs are derived at runtime from `test-resources.json` + `extracted-object-ids.json` using `deriveObjectId()`


## Adding your own scripts

Use the existing scripts as templates. The key utilities:

- `utils/helper.ts` — env config, context initialization, world config hydration
- `utils/derive-object-id.ts` — derive Sui object IDs from game item IDs
- `utils/proof.ts` — generate location proofs for proximity verification
- `helpers/` — query OwnerCap objects for gates, storage units, characters
