# Docker instructions (reviewing changes to `docker/`)

Use this when reviewing PRs that touch `docker/` (Dockerfile, compose files, scripts, readme, `.dockerignore`, env examples). The image provides Sui CLI + Node.js + pnpm for the [Docker flow](../../docs/builder-flow-docker.md) and must stay aligned with `docs/builder-flow-docker.md`.

## Review checklist

### Dockerfile

- **Base image**: Pin to a specific tag (e.g. `ubuntu:24.04`); avoid `latest`. Ubuntu 24.04 is required for the Sui binary.
- **Layers**: Combine `RUN` steps where it reduces layers and doesn’t hurt clarity; use `apt-get clean && rm -rf /var/lib/apt/lists/*` after installs.
- **Secrets**: No API keys, tokens, or private keys in the image. Keys are generated at runtime or mounted.
- **Scripts**: `COPY scripts/` and ensure entrypoint/scripts are executable and have correct line endings (`dos2unix` in image is acceptable).
- **PATH / env**: Sui CLI and any tools used by the flow must be on `PATH` (e.g. `suiup` bin).

### Compose (compose.yml, docker-compose.override.yml)

- **Ports**: Only expose what’s needed (e.g. 9000 for local RPC). Override files (e.g. GraphQL) should document ports in `docker/readme.md`.
- **Volumes**: Repo bind-mount as `/workspace/builder-scaffold`; `world-contracts` as documented. Persisted config (e.g. Sui keys) via named volumes, not host paths that leak user-specific data.
- **Reproducibility**: `docker compose build` and `docker compose run --rm --service-ports sui-dev` should match the flow doc. No reliance on uncommitted files except documented overrides (e.g. `world-contracts/` clone).

### Scripts (docker/scripts/)

- Follow [bash_scripts.md](bash_scripts.md): shebang, `set -euo pipefail` (or justified exception), quoting, no `eval` on user input.
- **entrypoint.sh**: Starts local node and prepares env; should be idempotent where possible and log clearly (e.g. “RPC ready”).
- **generate-world-env.sh**: Document in readme; only use env/source of truth that the flow doc expects (e.g. deployments, test-resources).

### Docs and env

- **docker/readme.md**: Update when adding ports, volumes, env vars, or steps. Keep “Quick start” minimal; put troubleshooting in `<details>` and link to `troubleshooting-guide.md` when appropriate.
- **Env**: New env vars (e.g. in `.env.sui`, override env) → document in readme and in `.env.example` or `env.testnet.example` at repo root or in `docker/` as applicable. No secrets in example files.

### .dockerignore

- Exclude unneeded context (e.g. `node_modules`, `.git`, large or sensitive paths) to keep builds fast and safe.

## Best practices to enforce

1. **Flow parity**: Any change that affects “run this in the container” must be reflected in `docs/builder-flow-docker.md` and `docker/readme.md` so the happy path still works.
2. **Localnet vs testnet**: Document when to use `-e testnet` for builds (e.g. Move.toml resolution) and when to use testnet for publishing; match flow doc.
3. **Clean rebuild**: `docker compose down --volumes` + `docker compose build` + run should produce a usable dev env; document any required host setup (e.g. clone world-contracts).
4. **No host assumptions**: Avoid scripts or compose that assume a specific host OS beyond what’s already documented (e.g. Windows PowerShell note in readme).

When in doubt, prefer minimal, documented behaviour and link to the flow doc and troubleshooting guide instead of adding long prose in the Docker readme.
