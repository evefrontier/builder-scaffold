# Copilot PR review agent — instruction summary

Use this as the entry point for PR reviews. For each changed area, apply the corresponding instruction file under [.github/instructions/](.github/instructions/). Suggest or request changes when the rules are violated.

---

## When to use which instructions

| Area | Instruction file | What to check |
|------|------------------|----------------|
| **Documentation** (README, flow docs, troubleshooting, any `.md` in docs/) | [instructions/documentation.md](instructions/documentation.md) | Easy-to-follow steps, clear wording, no duplication; happy path only in main flow; use docs guide “Where to put what”; link instead of copy. |
| **Bash / shell scripts** (`scripts/`, `docker/scripts/`, `setup-world/*.sh`) | [instructions/bash_scripts.md](instructions/bash_scripts.md) | Shebang, `set -e` / `set -euo pipefail`, quoting, errors to stderr, usage comment, env/paths, input validation, traps for background processes. |
| **Docker** (`docker/` — Dockerfile, compose, scripts, readme, env) | [instructions/docker.md](instructions/docker.md) | Pinned base image, no secrets in image, scripts executable; compose ports/volumes; flow parity with builder-flow-docker; doc and env var updates. |
| **Move contracts** (`move-contracts/`) | [instructions/move-contracts.md](instructions/move-contracts.md) | `pnpm fmt:check` and `pnpm lint`; Sui Move conventions; Move.toml and package layout; extension/typed-witness pattern; tests; readmes and cross-repo (world, ts-scripts) consistency. |
| **TypeScript scripts** (`ts-scripts/`) | [instructions/ts-scripts.md](instructions/ts-scripts.md) | Export core logic for npm; accept config as input (do not hard-depend on `hydrateWorldConfig`); use utils (config, helper, constants, derive-object-id); CLI as thin wrapper; docs and Docker/host flow compatibility. |

---

## General

- **Overlap:** A PR may touch several areas (e.g. Move + ts-scripts + docs). Apply each relevant instruction file.
- **CONTRIBUTING:** Broader code and doc guidelines are in [CONTRIBUTING.md](../CONTRIBUTING.md). Flow docs: [builder-flow-docker.md](../docs/builder-flow-docker.md), [builder-flow-host.md](../docs/builder-flow-host.md).
- When suggesting edits, prefer pointing to the specific instruction file and the rule that was violated.
