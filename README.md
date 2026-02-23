# Builder Scaffold

Templates and tools for building on EVE Frontier.

## Quickstart (end-to-end flow)

Run the full flow (world deploy → custom contract → scripts) in one of two ways:

| Path | When to use |
|------|--------------|
| **[Docker](docs/builder-flow-docker.md)** | No Sui/Node on host; run everything in a container (local or testnet). |
| **[Host](docs/builder-flow-host.md)** | Sui CLI + Node.js on your machine; target local or testnet. |

By the end you'll have a deployed world (local or testnet), a published custom contract (e.g. smart_gate), and scripts that call it.

## What's included

- **Docker** – Local dev environment (Sui CLI + Node.js)
- **Move contracts** – Extend Smart Assemblies (e.g. [smart_gate](move-contracts/smart_gate/))
- **TypeScript scripts** – Interact with deployed contracts ([ts-scripts/readme.md](ts-scripts/readme.md))
- **dApp template** – Extension use cases ([dapps/readme.md](dapps/readme.md))
- **zkLogin CLI** – OAuth-based signing ([zklogin/readme.md](zklogin/readme.md))

## Prerequisites

- [Git](https://git-scm.com/book/en/v2/Getting-Started-Installing-Git)
- [Docker](https://docs.docker.com/get-docker/) (optional but recommended for local dev)
- **Host path only:** [Sui CLI](https://docs.sui.io/guides/developer/getting-started) and Node.js

## High-level builder flow

The steps below are the same flow as the [Docker](docs/builder-flow-docker.md) and [Host](docs/builder-flow-host.md) guides; use those for detailed commands.

### Step 1: Set up your local environment

You need Sui tools and Node.js for local development.

**Using Docker (recommended):**

```bash
# From repo root
cd docker
docker compose run --rm sui-dev
```

More details: [docker/readme.md](./docker/readme.md)

**Or install on your host:**
Follow [Sui getting started](https://docs.sui.io/guides/developer/getting-started).

---

### Step 2: Deploy an EVE Frontier world

You need the EVE Frontier world contracts deployed and configured (local or testnet) to simulate game-server actions, which is a prerequisite for testing custom contract logic. See the [Docker](docs/builder-flow-docker.md) or [Host](docs/builder-flow-host.md) flow (deploy world step) or [setup-world/readme.md](setup-world/readme.md) for how to do it.

---

### Step 3: Deploy a custom Smart Assembly

Write custom Move logic to change how your Smart Assembly works. For examples, see the [smart_gate](./move-contracts/smart_gate/) package.

To build and publish your Move package, see [move-contracts/readme.md](./move-contracts/readme.md).

---

### Step 4: Test your custom logic

Write TypeScript scripts using the [`@mysten/sui`](https://www.npmjs.com/package/@mysten/sui) SDK to call your contract functions. You can also compose calls using [Programmable Transaction Blocks (PTBs)](https://docs.sui.io/concepts/transactions/prog-txn-blocks).

See [ts-scripts/readme.md](./ts-scripts/readme.md) for existing examples.

---

### Step 5: Use zkLogin (optional)

Test JWT-based auth on hosted networks (e.g. testnet).

See [zklogin/readme.md](./zklogin/readme.md)

---

### Step 6: Build a dApp

Create a dApp that talks to your deployed packages.

See [dapps/readme.md](./dapps/readme.md)

## Project structure

```
builder-scaffold/
├── docs/            # End-to-end flows (Docker, host)
├── setup-world/     # World deploy + seed
├── dapps/           # Reference dApp
├── docker/          # Dev containers
├── move-contracts/  # Custom contracts examples (e.g. smart_gate)
├── ts-scripts/      # TypeScript scripts
└── zklogin/         # zkLogin automation
```

## Contributing

Contributions welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) and open an issue or feature request before submitting PRs.
