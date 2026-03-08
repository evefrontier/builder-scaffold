# Bash / shell script review (for Copilot)

When **reviewing** shell script changes (e.g. in `scripts/`, `docker/scripts/`, `setup-world/*.sh`), check the following and suggest or request fixes when they are missing or violated.

## Scope

- **`scripts/`** — Repo-root scripts (e.g. `lint-move.sh`).
- **`docker/scripts/`** — Entrypoint and helpers (e.g. `entrypoint.sh`, `generate-world-env.sh`).

## Review checklist

1. **Shebang**  
   - `#!/usr/bin/env bash` when the script uses bash features (arrays, `[[`, `source`, `pipefail`, etc.).  
   - `#!/usr/bin/env sh` only for minimal, POSIX-only scripts.

2. **Fail-fast**  
   - Bash scripts: expect `set -euo pipefail` (norm in `docker/scripts/` and `setup-world/`).  
   - At minimum: `set -e`. Flag missing `set -e` or use of unquoted variables that could break with `set -u`.

3. **Quoting**  
   - All variable expansions should be quoted: `"$var"`, `"${dir}"`. Flag unquoted `$var` in commands or conditionals.  
   - Defaults: `"${VAR:-default}"`.

4. **Errors**  
   - Error messages must go to stderr (`>&2`) and the script should `exit 1`. Messages should say what failed and, if relevant, what to do next.

5. **Usage / docs**  
   - Top-of-file comment: purpose and, for non-obvious scripts, usage (e.g. `# Usage: ...`).  
   - If the script is referenced in README or docs, usage there should match.

6. **Paths and env**  
   - Prefer env vars for configuration with sensible defaults (`"${VAR:-default}"`).  
   - Docker scripts: paths should match repo conventions (e.g. `/workspace/builder-scaffold/`, `/workspace/world-contracts/`).

7. **Security and robustness**  
   - Inputs and parsed values (e.g. DB names, URLs) must be validated before use; reject empty or invalid and exit with a clear error.  
   - No execution of unvalidated user input; prefer whitelisting (e.g. safe-identifier regex) over blacklisting.  
   - Sensitive files (e.g. `.env.sui`): restrict permissions after writing (e.g. `chmod 600`).

8. **Background processes**  
   - If the script starts background processes (e.g. `sui start`), it should use a `trap` to kill them on exit.

## Reference scripts

- Minimal POSIX: `scripts/lint-move.sh`
- Bash, strict options, usage: `docker/scripts/generate-world-env.sh`, `setup-world/setup-world.sh`
- Complex flow, validation, traps: `docker/scripts/entrypoint.sh`

When suggesting changes, align with these. For new scripts in `scripts/`, prefer the style of `docker/scripts/` and `setup-world/` (bash, `set -euo pipefail`, clear usage and errors).
