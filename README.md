# Builder Scaffold

Templates and tools for building on EVE Frontier.

## Prerequisites

- [Git](https://git-scm.com/book/en/v2/Getting-Started-Installing-Git)
- [Docker](https://docs.docker.com/get-docker/) (for Docker path) **or** [Sui CLI](https://docs.sui.io/guides/developer/getting-started) + Node.js (for Host path)

## Quickstart

**1. Clone the repo**:

```bash
mkdir -p workspace && cd workspace
git clone https://github.com/evefrontier/builder-scaffold.git
cd builder-scaffold
```

**2. Follow one flow** (world deploy → build custom contract → interact):

| Path | When to use |
|------|--------------|
| **[Docker](./docs/builder-flow-docker.md)** | No Sui/Node on host; run everything in a container (local or testnet). Recommended for local testing  |
| **[Host](./docs/builder-flow-host.md)** | Sui CLI + Node.js on your machine; target local or testnet. |
| **[Building on an existing world](./docs/building-on-existing-world.md)** | World already deployed (e.g. shared server, live game); you don't deploy the world yourself. *(WIP – guide coming soon; use Docker/Host flows for now.)* |

By the end you’ll have a deployed world (or use an existing one), a published custom contract (e.g. `smart_gate_extension`), and scripts that call it.

## What's in this repo

| Area | Purpose |
|------|---------|
| [docker/](./docker/readme.md) | Dev container (Sui CLI + Node.js) — used by the Docker flow. |
| [move-contracts/](./move-contracts/readme.md) | Custom Smart Assembly examples (e.g. [smart_gate_extension](./move-contracts/smart_gate_extension/)); build & publish. |
| [ts-scripts/](./ts-scripts/readme.md) | TypeScript scripts to call your contracts; run after publishing. |
| [setup-world/](./setup-world/readme.md) | What “deploy world” does and what gets created (world flow steps are in the flow guides). |
| [dapps/](./dapps/readme.md) | Reference dApp template (optional next step). |
| [zklogin/](./zklogin/readme.md) | zkLogin CLI for OAuth-based signing (optional). |

## Contributing

Contributions welcome! Please read [CONTRIBUTING.md](./CONTRIBUTING.md) and open an issue or feature request before submitting PRs.
