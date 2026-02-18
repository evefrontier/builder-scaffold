# Builder Scaffold

Templates and tools for building on EVE Frontier.

## What's included

- **Docker** – Local dev environment (Sui CLI + Node.js)
- **Move contracts** – Extend Smart Assemblies with custom logic
- **TypeScript scripts** – Interact with deployed contracts
- **dApp template** – Extension use cases
- **zkLogin CLI** – OAuth-based transaction signing

Each directory has its own README for setup and usage.

## Prerequisites

- [Git](https://git-scm.com/book/en/v2/Getting-Started-Installing-Git)
- [Docker](https://docs.docker.com/get-docker/) (optional but recommended for local dev)

## High-level builder flow

### Step 1: Set up your local environment

You need Sui tools and Node.js for local development.

**Using Docker (recommended):**

```bash
# From repo root
cd docker
docker compose run --rm sui-local
```

More details: [docker/readme.md](./docker/readme.md)

**Or install on your host:**
Follow [Sui getting started](https://docs.sui.io/guides/developer/getting-started).

---

### Step 2: Deploy an EVE Frontier world

You need the EVE Frontier world contracts deployed and configured (local or testnet) to simulate game-server actions, which is a prerequisite for testing custom contract logic.

Deploy the [world contracts](https://github.com/evefrontier/world-contracts), then copy `deployments/` and `test-resources.json` into builder-scaffold.

See [setup-world/readme.md](./setup-world/readme.md) for detailed instructions.

---

### Step 3: Deploy a custom Smart Assembly

Write custom Move logic to change how your Smart Assembly works. For examples, see the [smart_gate](./move-contracts/smart_gate/) package.

To build and publish your Move package, see [move-contracts/readme.md](./move-contracts/readme.md).

---

### Step 4: Test your custom logic

Write TypeScript scripts using the [`@mysten/sui`](https://www.npmjs.com/package/@mysten/sui) SDK to call your contract functions. You can also compose calls using [Programmable Transaction Blocks (PTBs)](https://docs.sui.io/concepts/transactions/prog-txn-blocks).

See [ts-scripts/readme.md](./ts-scripts/readme.md) for existing examples.

End-to-end local/testnet flows: [docs/builder-flow.md](./docs/builder-flow.md).

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
├── docs/            # Builder flow (local, testnet)
├── setup-world/     # World deploy + seed instructions
├── dapps/           # Reference dApp
├── docker/          # Dev containers
├── move-contracts/  # Custom contract examples (e.g. smart_gate)
├── ts-scripts/      # TypeScript interaction scripts
└── zklogin/         # zkLogin automation
```

## Contributing

Contributions welcome! Please read our [contributing guidelines](./CONTRIBUTING.md) and open an issue or feature request before submitting PRs.
