# Builder Scaffold

Templates and tools for building on EVE Frontier.

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
| **[Docker](./docs/builder-flow-docker.md)** | No Sui/Node on host; run everything in a container (local or testnet). |
| **[Host](./docs/builder-flow-host.md)** | Sui CLI + Node.js on your machine; target local or testnet. |

By the end you’ll have a deployed world, a published custom contract (e.g. `smart_gate_extension`), and scripts that call it.

**Local development — pin world-contracts version:** For localnet, set `WORLD_CONTRACTS_BRANCH` (default `main`) and optional `WORLD_CONTRACTS_COMMIT` in `.env`, then run `pnpm setup-world-with-version` to checkout, deploy, and copy artifacts in one step.

## Prerequisites

- [Git](https://git-scm.com/book/en/v2/Getting-Started-Installing-Git)
- [Docker](https://docs.docker.com/get-docker/) (for Docker path) **or** [Sui CLI](https://docs.sui.io/guides/developer/getting-started) + Node.js (for Host path)

## What's in this repo

| Area | Purpose |
|------|---------|
| [docker/](./docker/readme.md) | Dev container (Sui CLI + Node.js) — used by the Docker flow. |
| [move-contracts/](./move-contracts/readme.md) | Custom Smart Assembly examples (e.g. [smart_gate_extension](./move-contracts/smart_gate_extension/)); build & publish. |
| [ts-scripts/](./ts-scripts/readme.md) | TypeScript scripts to call your contracts; run after publishing. |
| [setup-world/](./setup-world/readme.md) | What “deploy world” does and what gets created (world flow steps are in the flow guides). |
| [dapps/](./dapps/readme.md) | Reference dApp template (optional next step). |
| [zklogin/](./zklogin/readme.md) | zkLogin CLI for OAuth-based signing (optional). |

### Extension examples

| Assembly | Examples | Details |
|----------|----------|---------|
| **Gate** | Corpse bounty, Tribe permit | [smart_gate_extension readme](./move-contracts/smart_gate_extension/readme.md) |
| **Storage Unit** | Marketplace, Supply Unit | [storage_unit_extension readme](./move-contracts/storage_unit_extension/readme.md) |
| **Tokens** | Open currency (CURRENCY_TOKEN), Tribe token | [tokens readme](./move-contracts/tokens/readme.md) |


## Contributing

Contributions welcome! Please read [CONTRIBUTING.md](./CONTRIBUTING.md) and open an issue or feature request before submitting PRs.
