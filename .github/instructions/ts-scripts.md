# TypeScript scripts review (for Copilot PR review agent)

When **reviewing PRs** that change `ts-scripts/`, enforce the rules below. Suggest or request changes when they are violated.

**Scope:** `ts-scripts/` (CLI entrypoints under e.g. `smart_gate/`, shared `utils/`). Scripts must work with [Docker and host flows](../../docs/builder-flow-docker.md). See [ts-scripts/readme.md](../../ts-scripts/readme.md) and [CONTRIBUTING](../../CONTRIBUTING.md).

---

## 1. Export core logic for npm

- Export main behavior as named functions with explicit parameters (client, keypair, config, etc.). Don’t hide it only in `main()`.
- CLI = thin wrapper: read env/options, build context, call the exported function(s).
- **Reference:** `utils/transaction.ts` (exports `executeSponsoredTransaction`). Flag scripts that only expose `main()` with no exportable API.

## 2. Config as input; `hydrateWorldConfig` is optional

- Script logic should **accept** world config (or context that includes it) as an argument. It must not assume config came from `hydrateWorldConfig`.
- `hydrateWorldConfig` is one way to get config (env + deployment files). Use it only in the CLI layer if needed; callers with their own config must be able to pass it in.
- **Exported functions:** take config/context as params; do not call `hydrateWorldConfig` inside them. **CLI:** may call `hydrateWorldConfig` to get config, then pass it into the exported function.
- Flag logic that calls `hydrateWorldConfig` inside exported functions or has no way to supply config except via it.

## 3. Repo alignment

- Use **utils:** [config.ts](../../ts-scripts/utils/config.ts), [helper.ts](../../ts-scripts/utils/helper.ts), [constants.ts](../../ts-scripts/utils/constants.ts), [derive-object-id.ts](../../ts-scripts/utils/derive-object-id.ts) for types, context, IDs. Use `handleError` in CLI; exported functions should throw.
- Update [ts-scripts/readme.md](../../ts-scripts/readme.md) when adding scripts or env/options. New env vars → `.env.example` and readme.
- Scripts must work in both Docker and host environments.
