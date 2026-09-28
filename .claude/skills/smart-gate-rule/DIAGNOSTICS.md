# Diagnostics

Match the error name that `pnpm tx-status` (or the zkLogin terminal) reports. Explain the
cause in one plain sentence, then give the single next action. Nothing changes on chain
when a transaction fails, so retrying after the fix is always safe.

## Aborts from the participant's package

| Error | Cause | Next action |
|---|---|---|
| code 100+ (their own error) | Their rule denied the jump — it's working. | Celebrate, then offer to change the rule or what they hand in. |
| `ECorpseTypeMismatch` | The item handed in isn't the bounty type. | Check `CORPSE_TYPE_ID` in `.env` matches the corpses at their storage unit (`pnpm preflight` shows the count). |
| `ENoBountyConfig` | The gate was never set up with this package. | `pnpm setup-gate`, sign, then retry. |
| `ECorpseTypeIdEmpty` | `CORPSE_TYPE_ID` is 0. | Set it from the kit card; rerun `pnpm setup-gate`. |
| `EExpiryOverflow` | `PERMIT_EXPIRY_MS` is absurdly large. | Remove it from `.env` to use the one-hour default. |

## Aborts from the world

| Error | Cause | Next action |
|---|---|---|
| `ESenderCannotAccessCharacter` | Signed by an address that doesn't own the character — usually logged in with the wrong EVE Frontier account. | Restart the zkLogin terminal and log in with the kit's account; it checks against `ZKLOGIN_ADDRESS`. |
| `EExtensionNotAuthorized` | A gate or the storage unit still trusts a different package — usually the rule was republished without rerunning setup. | `pnpm setup-gate`, sign, retry. |
| `ENotOnline` | A gate or the storage unit is offline, often a network node out of fuel. | Facilitator. |
| `EGatesNotLinked` | The kit's two gates aren't linked. | Facilitator. |
| `EGateNotAuthorized`, `EAssemblyNotAuthorized`, `EOwnerCapIdMismatch` | An item ID in `.env` points at an assembly this character doesn't own. | `pnpm resolve-ids`; compare against the kit card. |
| `EInventoryNotAuthorized`, `EItemDoesNotExist`, `EInventoryInsufficientQuantity` | No (or too few) corpses in the character's inventory **at their storage unit** — ship cargo doesn't count. | Deposit corpses at the storage unit in-game; `pnpm preflight` shows the count. |
| `EExtensionConfigFrozen` | The kit's extension was frozen and can never change. | Facilitator, for a spare kit. |
| `EJumpPermitExpired` | The permit's hour ran out. | `pnpm collect-corpse-bounty` again for a fresh one. |

## Failures before execution

These come from the builder script or the zkLogin terminal rather than an abort.

| Symptom | Cause | Next action |
|---|---|---|
| Build error or lint warning | The rule block doesn't compile cleanly. | Fix it against [RULES.md](RULES.md) conventions; rebuild. |
| `No OwnerCap found for …` / `not found on chain` | Wrong item ID or `TENANT`. | `pnpm resolve-ids`. |
| `AdminCap not found` | This address didn't publish `BUILDER_PACKAGE_ID`. | Rerun `pnpm record-publish` after the publish succeeds, or republish. |
| `No result yet` | The pending transaction hasn't been signed. | Ask them to load the file in the zkLogin terminal. |
| Object version / "not available for consumption" | Bytes went stale — something changed after they were built. | Rerun the same `pnpm` step for fresh bytes, then sign. |
| Insufficient gas / no SUI | The kit address is unfunded. | Facilitator. |
| Proof expired / invalid signature in the zkLogin terminal | The login session aged out. | Restart the zkLogin terminal and log in again. |
| `Sui CLI is on "…", not testnet` | Publish needs the CLI on testnet to fetch the world package. | `sui client switch --env testnet`. |
