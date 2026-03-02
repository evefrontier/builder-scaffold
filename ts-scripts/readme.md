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
cp .env.example .env    # fill in keys, WORLD_PACKAGE_ID, GATE_EXTENSION_PACKAGE_ID
pnpm install
```

Set `WORLD_PACKAGE_ID`, `GATE_EXTENSION_PACKAGE_ID`, and other environment variables in `.env` from your extension package deployment output (or use `pnpm publish-smart-gate-extension` / `pnpm publish-currency-token` / `pnpm publish-tribe-token` to capture them automatically).

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
# 1. Publish storage unit extension
pnpm publish-storage-unit-extension
# Add STORAGE_UNIT_EXTENSION_PACKAGE_ID to .env

# 2. Marketplace flow
pnpm create-marketplace
# Add MARKETPLACE_ID to .env from output
pnpm list-item
pnpm buy-item

# 3. Supply unit flow
pnpm create-supply-unit
# Add SUPPLY_UNIT_ID to .env from output

# 4. Ensure buyer (Player B) has CURRENCY_TOKEN — run before order-items
pnpm mint-currency-token        # mint 1 000 000 tokens directly to Player B
# or: pnpm transfer-currency-token  # top-up to 10 000 minimum (safe if already funded)

# 5. Stock (admin must have items in ephemeral first)
pnpm stock-supply-unit

# 6. Order (Player B's coin is auto-selected from their wallet)
pnpm order-items
```

Required env vars per script: see script headers or [storage_unit_extension readme](../move-contracts/storage_unit_extension/readme.md).

## Customization

- Edit `test-resources.json` to change item IDs, type IDs, or location hash
- Object IDs are derived at runtime from `test-resources.json` + `extracted-object-ids.json` using `deriveObjectId()`

## Adding your own scripts

Use the existing scripts as templates. The key utilities:

- `utils/helper.ts` — env config, context initialization, world config hydration
- `utils/derive-object-id.ts` — derive Sui object IDs from game item IDs
- `utils/proof.ts` — generate location proofs for proximity verification
- `helpers/` — query OwnerCap objects for gates, storage units, characters
