# TypeScript scripts

Interact with your deployed extension contracts from TypeScript.

## Prerequisites

1. World contracts deployed and configured (see [setup-world](../setup-world/readme.md))
2. `deployments/` and `test-resources.json` copied to this repo's root
3. Your extension package published (e.g. `smart_gate_extension`)

> **Redeploying?** If you need to republish contracts (e.g. after switching branches or restarting localnet), run `pnpm rebuild-world` first. This clears stale artifacts and `Pub.localnet.toml` so publish scripts don't fail with "already published".

## Setup

```bash
# From repo root
cp .env.example .env    # fill in: SUI_NETWORK, keys, addresses, WORLD_CONTRACTS_BRANCH (+ WORLD_CONTRACTS_COMMIT to pin a tag)
pnpm install
```

All package IDs and object IDs are **auto-read from deployment files**:
- `deployments/<network>/extracted-object-ids.json` — written by `setup-world-with-version` and each `pnpm publish-*` script
- `deployments/<network>/runtime-object-ids.json` — written by `pnpm create-marketplace` / `create-supply-unit`
- `deployments/<network>/seed-resources.json` — written by `pnpm seed`; tracks local seeding state

Set a variable in `.env` only if you need to override a file-based value or if you prefer to refence the env for your scripts rather than the `extracted-object-ids.json`.

## Local seeding (`pnpm seed`)

`pnpm seed` runs after `setup-world-with-version` automatically and can be re-run manually at any time. **Already-completed steps are skipped** — safe to run multiple times. Seeding state is tracked in `deployments/<network>/seed-resources.json`, which is cleared by `rebuild-world` so re-seeding happens automatically after a chain reset.

**How it works:**

`ts-scripts/seed.ts` is the single entry point. Each seeding step is a function call. Two built-in steps run out of the box:

```typescript
// ts-scripts/seed.ts
await seedPlayerAInventory(env);    // built-in: supply unit prereq (Player A stocks)
await seedPlayerCInventory(env);    // built-in: marketplace prereq (Player C lists)
// await seedMyCustomStep(env);     // add your own steps here
```

| Step | Seeds | Required for |
| ---- | ----- | ------------ |
| `seedPlayerAInventory` | Player A: 20× typeId 446, itemId 444000003 | `pnpm stock-supply-unit` |
| `seedPlayerCInventory` | Player C: 10× typeId 447, itemId 444000002 | `pnpm list-item` / `buy-item` |

**Adding your own seeding:**

1. Write a function in `seed.ts` that performs your transaction(s) and writes its result to `seed-resources.json`:

```typescript
async function seedMyCustomStep(env: ReturnType<typeof getEnvConfig>): Promise<void> {
    const seeds = readSeedResources(env.network);
    if (seeds.myCustomStep) {
        console.log("  [skip] my custom step already seeded");
        return;
    }

    // ... run your transaction ...

    upsertSeedResources(env.network, (data) => {
        // store the actual values used — mirrors test-resources.json style
        data.myCustomStep = { objectId: "0x...", quantity: 10 };
    });
    console.log("  [done] my custom step");
}
```

2. Call it from `main()` in `seed.ts`:

```typescript
await seedMyCustomStep(env);
```

The next `pnpm seed` (or `pnpm setup-world-with-version`) will run your step. After a `pnpm rebuild-world` the seed file is cleared and all steps re-run from scratch.

**`seed-resources.json` shape** (example after seeding):

```json
{
  "network": "localnet",
  "playerAInventory": {
    "typeId": 446,
    "itemId": 444000003,
    "quantity": 20
  },
  "playerCInventory": {
    "typeId": 447,
    "itemId": 444000002,
    "quantity": 10
  },
  "myCustomStep": {
    "objectId": "0x...",
    "quantity": 10
  }
}
```

## Example: interact with custom Smart Gate

After publishing `move-contracts/smart_gate_extension/`, run the scripts in order:

```bash
# 1. Configure extension rules (tribe config + bounty config)
pnpm configure-rules

# 2. Authorize the extension on gates and storage unit
pnpm authorise-gate
pnpm authorise-storage-unit

# 3. Issue a jump permit (tribe-based) — typically happens in a dApp
pnpm issue-tribe-jump-permit

# 4. Jump using the permit — typically happens in the game UI
pnpm jump-with-permit

# 5. Collect corpse bounty for a jump permit
pnpm collect-corpse-bounty
```

## Example: Token Scripts

After publishing `move-contracts/tokens/` (currency_token and tribe_token):

```bash
# Publish tokens
pnpm publish-currency-token
pnpm publish-tribe-token

# Mint CURRENCY_TOKEN — defaults to Player B address
pnpm mint-currency-token

# Ensure Player B has at least TRANSFER_AMOUNT tokens (default: 10000).
# Checks existing balance; mints the shortfall only. Safe to run multiple times.
pnpm transfer-currency-token

# Tribe token (requires configure first)
pnpm configure-tribe-token
pnpm mint-tribe-token
pnpm transfer-tribe-token   # needs TOKEN_OBJECT_ID, RECIPIENT_ADDRESS, RECIPIENT_CHARACTER_ID
```

## Example: interact with Storage Unit Extension

After publishing `move-contracts/storage_unit_extension/` and tokens:

```bash
# 1. Publish storage unit extension (IDs auto-saved to extracted-object-ids.json)
pnpm publish-storage-unit-extension

# 2. Marketplace flow (MARKETPLACE_ID auto-saved to runtime-object-ids.json)
# Player C (seller) seeded with typeId 447 by pnpm seed (runs via setup-world-with-version)
# Player B (buyer) pays with typeId 446 — seeded by world-contracts create-test-resources
# list-item reads listedTypeId from deployments/<network>/seed-resources.json automatically
pnpm create-marketplace
pnpm list-item
pnpm buy-item

# 3. Supply unit flow (SUPPLY_UNIT_ID auto-saved to runtime-object-ids.json)
pnpm create-supply-unit

# 4. Ensure buyer (Player B) has CURRENCY_TOKEN — run before order-items
pnpm mint-currency-token        # mint 1 000 000 tokens directly to Player B
# or: pnpm transfer-currency-token  # top-up to 10 000 minimum (safe if already funded)

# 5. Stock — Player A's inventory (typeId 446) seeded automatically by pnpm seed
# stock-supply-unit reads typeId from deployments/<network>/seed-resources.json
pnpm stock-supply-unit

# 6. Order (Player B's coin is auto-selected from their wallet)
pnpm order-items
```

Required env vars per script: see script headers or [storage_unit_extension readme](../move-contracts/storage_unit_extension/readme.md).

## Customization

- Edit `test-resources.json` to change item IDs, type IDs, or location hash
- Object IDs are derived at runtime from `test-resources.json` + `extracted-object-ids.json` using `deriveObjectId()`
- Add seeding steps to `ts-scripts/seed.ts`; results are stored in `deployments/<network>/seed-resources.json`

## Adding your own scripts

Use the existing scripts as templates. The key utilities:

- `utils/helper.ts` — env config, context initialization, world config hydration
- `utils/derive-object-id.ts` — derive Sui object IDs from game item IDs
- `utils/proof.ts` — generate location proofs for proximity verification
- `helpers/` — query OwnerCap objects for gates, storage units, characters
