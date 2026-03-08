# Move contracts review (for Copilot PR review agent)

When **reviewing PRs** that change code under `move-contracts/`, enforce the rules below and the repo’s tooling. Suggest or request changes when they are violated.

## Scope

- **`move-contracts/`** — All Move packages (e.g. `smart_gate_*`, `storage_unit_*`, `tokens`). Each package has:
  - `Move.toml` at package root
  - `sources/` for `.move` modules
  - `tests/` for test modules (optional but preferred for new logic)
  - Package-specific `readme.md` when the package is a non-trivial example

## Repo tooling (must pass)

- **Format:** `pnpm fmt:check` — Move files are formatted with Prettier (`move-contracts/**/*.move`). Flag unformatted or inconsistently formatted Move.
- **Lint:** `pnpm lint` — Runs `sui move build --path <pkg> --lint` for each package in `move-contracts/*/`. Flag changes that would break build or lint; recommend running `pnpm lint` locally.

New or modified packages must be under `move-contracts/<pkg>/` with a valid `Move.toml` so the existing `scripts/lint-move.sh` loop picks them up.

## Review criteria

1. **Conventions and quality**  
   - Follow [Sui Move conventions](https://docs.sui.io/concepts/sui-move-concepts/conventions) and the [Move code quality checklist](https://move-book.com/guides/code-quality-checklist) (as in [CONTRIBUTING.md](../../CONTRIBUTING.md)).  
   - Flag style or structural violations (e.g. inconsistent naming, missing doc comments on public APIs, unclear error codes).

2. **Package layout and Move.toml**  
   - Each package has a single `Move.toml` at its root; `[package]` name matches the directory (e.g. `smart_gate`).  
   - Use `edition = "2024"` unless there is a stated reason for legacy.  
   - `[addresses]`: package name = `"0x0"` for development; use `[environments]` when the package is built for multiple networks (see `move-contracts/tokens/Move.toml`).  
   - Dependencies: world-dependent packages use `world = { local = "..." }` or a pinned git `rev`; avoid unversioned git refs that can break the scaffold.  
   - Flag new packages that are not under `move-contracts/<name>/` or that would be skipped by `scripts/lint-move.sh` (e.g. missing `Move.toml`).

3. **Extension pattern (world-dependent packages)**  
   - Extensions that plug into the world (e.g. smart_gate) follow the [typed witness pattern](https://github.com/evefrontier/world-contracts/blob/main/docs/architechture.md#layer-3-player-extensions-moddability). Design context: [evefrontier/world-contracts](https://github.com/evefrontier/world-contracts) and its architecture docs.  
  
4. **Tests**  
   - New or changed logic should have corresponding tests in `tests/` where feasible.  
   - Flag substantial new behavior without tests.

7. **Docs and readmes**  
   - Package-level `readme.md`: explain purpose, how to build/publish, and any extension-specific caveats (see `move-contracts/readme.md` and `move-contracts/smart_gate/readme.md`).  
   - Root `move-contracts/readme.md`: update when adding a new top-level package or changing build/lint/format instructions.  
   - Flag new packages without a readme or doc updates that leave the main Move readme or CONTRIBUTING references outdated.

## Cross-repo references

- **World dependency** — Extensions depend on the world contract; build and publish steps differ for [testnet vs local](https://docs.sui.io/guides/developer/packages/move-package-management). Ensure readme and flow docs (e.g. [builder-flow-docker](../../docs/builder-flow-docker.md), [builder-flow-host](../../docs/builder-flow-host.md)) stay consistent with any new Move packages or publish steps.
- **TypeScript scripts** — Many extensions are driven by `ts-scripts/` (e.g. `configure-rules`, `authorise-gate`, `issue-tribe-jump-permit`). Flag Move changes that break or bypass the documented script flow without updating the scripts or docs.
- **Extension caveats** (from `move-contracts/readme.md`): one extension per gate; TypeName includes package ID (redeploy breaks existing auth/config). Flag changes that ignore these without documenting the impact.

## When suggesting edits

- Prefer aligning with existing packages (`smart_gate`, `storage_unit`, `tokens`) in layout, Move.toml style, and use of shared config, errors, and doc comments.  
- Point to [CONTRIBUTING.md](../../CONTRIBUTING.md) and the [documentation guide](../../docs/documentation-guide.md) for where to document new env vars, publish steps, or extension behavior.
