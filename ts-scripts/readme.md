# TypeScript scripts

Build transactions against the live Liminality world on Sui testnet. The scripts never
sign: each writes an unsigned transaction to `zklogin/pending/<step>.tx`, which you sign in
the [zkLogin tool](../zklogin/readme.md). Full walkthrough:
[building on an existing world](../docs/building-on-existing-world.md).

## Setup

```bash
# From repo root
cp .env.example .env    # your zkLogin address and in-game item IDs
pnpm install
pnpm preflight
```

## Scripts

| Script | Does |
|---|---|
| `pnpm preflight` | Checks toolchain and your kit on chain (read-only) |
| `pnpm resolve-ids [itemId…]` | Derives object IDs from in-game item IDs and checks they exist |
| `pnpm publish-extension` | Builds and prepares the publish of `smart_gate_extension` |
| `pnpm record-publish` | Saves the new package and `ExtensionConfig` IDs to `.env` |
| `pnpm setup-gate` | Sets the rule config and authorizes your extension on both gates and the storage unit |
| `pnpm collect-corpse-bounty` | Hands in a corpse for a `JumpPermit` |
| `pnpm issue-tribe-jump-permit` | Fallback rule: a permit by tribe (`RULE=tribe`) |
| `pnpm check-permit` | Shows the `JumpPermit`s you hold |
| `pnpm tx-status` | Reports whether the last signed transaction succeeded |
| `pnpm gen:mvr` | Regenerates the world MVR cache after a world upgrade |

Add `--paste` to any build step to also print the bytes for pasting.

## Adding your own scripts

Use the existing scripts as templates. The key pieces:

- `mvr/resolve.ts` — `worldTarget()` for call targets, `worldType()` for type tags; never
  build world type strings by hand
- `utils/helper.ts` — `initializeContext()`: client, world config, your zkLogin address
- `utils/submit.ts` — `submit(tx, ctx, step)`: build for your address and write the bytes
- `utils/derive-object-id.ts` — derive object IDs from in-game item IDs
- `smart_gate_extension/kit.ts` — your kit's object IDs, and `withOwnerCap()` for the
  borrow/return pair
- `helpers/owner-cap.ts` — look up the `OwnerCap` of a character, gate or storage unit
