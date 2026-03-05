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
- `deployments/<network>/runtime-object-ids.json` — written by `pnpm create-marketplace` / `create-supply-unit`
- `deployments/<network>/seed-resources.json` — written by `pnpm seed`; tracks local seeding state

Set a variable in `.env` only if you need to override a file-based value or if you prefer to reference the env for your scripts rather than the `extracted-object-ids.json`.

## Local seeding (`pnpm seed`)

> `pnpm seed` is a **localnet development tool** — it is skipped automatically when `SUI_NETWORK` is not `localnet`.

`pnpm seed` runs at the end of `pnpm setup-world` automatically and can be re-run manually at any time. **Already-completed steps in the seed script are skipped** — making the seed script safe to run multiple times wihtout overwriting or changing existing seeded data. Seeding state is tracked in `deployments/<network>/seed-resources.json`, which is cleared by `pnpm rebuild-world` so re-seeding happens automatically after a chain reset.

`ts-scripts/seed.ts` is the single entry point. Add your own seeding steps as functions and call them from `main()`:

```typescript
async function seedMyCustomStep(env: ReturnType<typeof getEnvConfig>): Promise<void> {
    const seeds = readSeedResources(env.network);
    if (seeds.myCustomStep) {
        console.log("  [skip] my custom step already seeded");
        return;
    }

    // ... run your transaction ...

    upsertSeedResources(env.network, (data) => {
        data.myCustomStep = { objectId: "0x...", quantity: 10 };
    });
    console.log("  [done] my custom step");
}
```

Then call it from `main()`:

```typescript
await seedMyCustomStep(env);
```

The next `pnpm seed` (or `pnpm setup-world`) will run your step. After `pnpm rebuild-world` the seed file is cleared and all steps re-run from scratch.

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

## Example: Token Scripts

Publishing and interacting with `move-contracts/currency_token/` and `move-contracts/tribe_token/`:

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

## Example: Storage Unit Extension

> **Prerequisites:** `pnpm seed` must have run at least once (called automatically by `pnpm setup-world`). It seeds Player A's inventory (needed for `stock-supply-unit`) and Player C's inventory (needed for `list-item` / `buy-item`).

After publishing `move-contracts/storage_unit_extension/` and tokens:

```bash
# 1. Publish storage unit extension (IDs auto-saved to extracted-object-ids.json)
pnpm publish-storage-unit-extension

# 2. Marketplace flow (MARKETPLACE_ID auto-saved to runtime-object-ids.json)
# Player C (seller) seeded with typeId 447 by pnpm seed (runs via setup-world)
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

- `test-resources.json` is auto-synced from world-contracts by `setup-world` — do not edit it directly. Use `.env` to override individual IDs.
- Object IDs are derived at runtime from `test-resources.json` + `extracted-object-ids.json` using `deriveObjectId()`
- Add seeding steps to `ts-scripts/seed.ts`; results are stored in `deployments/<network>/seed-resources.json`


## Adding your own scripts

Use the existing scripts as templates. The key utilities:

- `utils/helper.ts` — env config, context initialization, world config hydration
- `utils/derive-object-id.ts` — derive Sui object IDs from game item IDs
- `utils/proof.ts` — generate location proofs for proximity verification
- `helpers/` — query OwnerCap objects for gates, storage units, characters
