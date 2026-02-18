# Builder Scaffold

Templates and tools for building on EVE Frontier.

## What's included

- **Docker** – Local dev environment (Sui CLI + Node.js)
- **Move contracts** – Extend Smart Assemblies with custom logic
- **TypeScript & Rust scripts** – Interact with contracts
- **dApp template** – Extension use cases
- **zkLogin CLI** – OAuth-based transaction signing

Each directory has its own README for setup and usage.

## Prerequisites

- [Git](https://git-scm.com/book/en/v2/Getting-Started-Installing-Git)
- [Docker](https://docs.docker.com/get-docker/) (optional but recommended for local dev)


## High Level builder Flow

### Step 1: Set up your local environment

You need Sui tools and Node.js for local development. You can do this by:

**Using Docker (recommended):**
```bash
# from repo root
cd docker 
docker compose run --rm sui-local
```

More details: [docker/readme.md](./docker/readme.md)

**Or Installing on your host:**  
Follow [Sui getting started](https://docs.sui.io/guides/developer/getting-started).

---

### Step 2: Deploy an EVE Frontier world

You need the EVE Frontier world contracts deployed and configured (local or testnet) to simulate game server actions which is a pre-requisite to test custom contracts logic. 

Deploy the [world contracts](https://github.com/evefrontier/world-contracts), then copy `deployments/` and `test-resources.json` to builder-scaffold. 

Refer [setup-world/readme.md](./setup-world/readme.md) for detailed instructions. 

End-to-end: [docs/builder-flow.md](./docs/builder-flow.md).
---

### Step 3: Deploy a Custom Smart Assembly

Write custom Move logic to change how your Smart Assembly works. For examples, refer [move-contracts](./move-contracts/smart_gate/)

To Build and publish your Move package refer [move-contracts/readme.md](./move-contracts/readme.md).

---

### Step 4: Test your custom logic
You can write scripts either in typescript or rust using the `@mysten/sui` sdks to call the custom contracts functions.

You can also build PTB's to call the custom contract functions

See [ts-scripts/readme.md](./ts-scripts/readme.md) to see the existing examples. 

End to end local/testnet flows: [docs/builder-flow.md](./docs/builder-flow.md).
---

### Step 5: Use zkLogin (optional)

Test JWT-based auth on hosted networks (e.g. testnet).

See [zklogin/readme.md](./zklogin/readme.md)

---

### Step 6: Build a dApp

Create a dApp that talks to your deployed packages.

Do this: See [dapps/readme.md](./dapps/readme.md)


## Project Structure
```
builder-scaffold/
├── docs/            # Builder flow (local, testnet)
├── setup-world/     # World deploy + seed instructions
├── dapps/           # Reference dApp
├── docker/          # Dev containers
├── move-contracts/  # custom contract for assembly examples (e.g. smart_gate)
├── rust-scripts/    # Rust interaction scripts
├── ts-scripts/      # TypeScript interaction scripts
└── zklogin/         # zkLogin automation
```

## Contributing

Contributions welcome! Please read our [contributing guidelines](./CONTRIBUTING.md) and open an issue/feature request before submitting PRs.