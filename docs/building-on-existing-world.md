# Building on an existing world

Change who can pass a Smart Gate on the live **Liminality** world, on Sui testnet. You
don't deploy a world: you publish your own extension package and point your gates at it.

Every transaction is signed by your EVE Frontier game account through the
[zkLogin tool](../zklogin/readme.md). The scripts in this repo never hold a private key —
they build unsigned transactions, and you sign them in a second terminal.

```
 Terminal 1 — pnpm scripts (or Claude)       Terminal 2 — zkLogin tool (you)
 ─────────────────────────────────────       ─────────────────────────────────
 pnpm <step>  → writes zklogin/pending/…  ──▶ load the file → sign → execute
 pnpm tx-status / record-publish          ◀── writes zklogin/last-tx.json
```

## What you need

Your EVE Frontier account needs, on Liminality:

- a **character**
- **two gates**, online, linked to each other, owned by that character
- a **storage unit**, online, owned by that character, with **corpses in your character's
  inventory at that storage unit** (ship cargo doesn't count)
- some **testnet SUI** on your account's address for gas

And on your machine: Node.js ≥ 22, pnpm, and the Sui CLI switched to testnet
(`sui client switch --env testnet`).

## Setup

```bash
pnpm install
(cd zklogin && pnpm install)
cp .env.example .env                 # your address and in-game item IDs
cp zklogin/.env.example zklogin/.env # auth and Enoki settings
pnpm preflight
```

`pnpm preflight` checks your toolchain and your assemblies on chain, and prints a fix for
anything that fails. Carry on once it prints `PREFLIGHT PASSED`.

Start the zkLogin tool in a second terminal and log in:

```bash
cd zklogin && pnpm zklogin
```

## Finding your object IDs

On-chain object IDs are derived from in-game item IDs, so you only need the item IDs.
Put them in `.env`, then check they resolve:

```bash
pnpm resolve-ids                 # every item ID in .env
pnpm resolve-ids 1000000012372   # any item ID
```

A derived ID depends on the world's object registry, the `TenantItemId` type, and your
tenant (`liminality`). Those are fixed for the world and committed in
[ts-scripts/mvr/](../ts-scripts/mvr/). A wrong tenant derives a valid-looking ID for an object that
doesn't exist, which is the usual cause of "not found".

## The flow

Three transactions. After each `pnpm` step, load the printed file path in the zkLogin tool.

| # | Build | Sign, then check | What it does |
|---|---|---|---|
| 1 | `pnpm publish-extension` | `pnpm record-publish` | Publishes your package; saves `BUILDER_PACKAGE_ID` and `EXTENSION_CONFIG_ID` to `.env` |
| 2 | `pnpm setup-gate` | `pnpm tx-status` | Sets the bounty and authorizes your extension on **gate 1, gate 2 and the storage unit** |
| 3 | `pnpm collect-corpse-bounty` | `pnpm check-permit` | Hands in a corpse; your rule decides whether you get a `JumpPermit` |

Then jump through your gate in the game.

### Why three assemblies

Your extension is a type, `<your package>::config::XAuth`, and each assembly trusts one
extension type:

- `gate::issue_jump_permit<XAuth>` checks the extension on **both** gates of the route.
- `storage_unit::deposit_item<XAuth>` checks it on the **storage unit** the corpse goes into.
  (`withdraw_by_owner` needs no extension — it's authorized by your character.)

`setup-gate` does all three in one transaction so none can be missed. A rule that doesn't
touch inventory (`RULE=tribe`) needs only the two gates.

### Changing your rule

A published package can't change, and your gates trust its exact type. To change the rule,
edit it and repeat all three steps: `setup-gate` points your gates at the new package.

`authorize_extension` replaces whatever extension was there before, so reusing gates is fine.
**Never call `freeze_extension_config`** on a gate you want to change again: freezing is
permanent.

## World resolution (MVR)

The world package is resolved through the [Move Registry](https://www.moveregistry.com/) as
`@evefrontier/world`. A resolved world has two kinds of ID, and the scripts keep them apart:

- the **latest package** — for `moveCall` targets (`worldTarget()` in
  [resolve.ts](../ts-scripts/mvr/resolve.ts))
- each type's **type-origin** — the package version that first defined it, for type
  arguments, object-ID derivation and type filters (`worldType()`)

They're identical until the world is upgraded, then they diverge, so each type is resolved
individually. The resolutions are a committed, generated cache
([mvrCache.generated.ts](../ts-scripts/mvr/mvrCache.generated.ts)). After a world upgrade,
regenerate it:

```bash
pnpm gen:mvr
```

To resolve a new world type, add it to [worldTypeKeys.ts](../ts-scripts/mvr/worldTypeKeys.ts)
first. The world's `objectRegistry` and `adminAcl` are shared objects rather than packages,
so they live in [tenants.ts](../ts-scripts/mvr/tenants.ts) and must be updated if the world is
redeployed.

The Move side builds against the world source pinned in
[Move.toml](../move-contracts/smart_gate_extension/Move.toml). Liminality shares
`@evefrontier/world` with Stillness, so the build environment is `testnet_stillness`.

## Signers

| Operation | Signed by | Sponsored |
|---|---|---|
| Publish, set up gate, hand in corpse | your zkLogin address | no — you pay gas |
| Jump (`jump_with_permit`) | your character, via the game | yes — it requires an `AdminACL`-enrolled sponsor, which is why jumping happens in the game client |
