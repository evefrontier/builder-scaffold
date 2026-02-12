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


## Builder Flow

### Step 1: Set up your local environment

You need Sui tools and Node.js. You can do this by:

**Using Docker (recommended):**
```bash
# from repo root
cd docker 
docker compose run --rm sui-local
```

Full details: [docker/readme.md](./docker/readme.md)

**Or Installing on your host:**  
Follow [Sui getting started](https://docs.sui.io/guides/developer/getting-started).

---

### Step 2: Deploy an EVE Frontier world

Deploy the [world contracts](https://github.com/evefrontier/world-contracts) and create test resources.

See [setup-world/readme.md](./setup-world/readme.md)

---

### Step 3: Extend a Smart Assembly

Write custom Move logic to change how your Smart Assembly works.

See [move-contracts](./move-contracts/readme.md) for example custom logic to extend [Smart Storage Unit](./move-contracts/storage_unit/), 
[Smart Gate](./move-contracts/gate/) and [Smart Turret](./move-contracts/gate/) 

---

### Step 4: Deploy and test your logic

1. Build and publish your Move package.
2. Authorize it for a Smart Assembly you own.
3. Run interaction scripts (TypeScript or Rust) against your environment.

See [ts-scripts/readme.md](./ts-scripts/readme.md) or [rust-scripts/readme.md](./rust-scripts/readme.md)

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
├── dapps/           # Reference dApp
├── docker/          # Dev containers
├── move-contracts/  # Move extension examples
├── rust-scripts/    # Rust interaction scripts
├── ts-scripts/      # TypeScript interaction scripts
└── zklogin/         # zkLogin automation
```

## Contributing

Contributions welcome! Please read our [contributing guidelines](./CONTRIBUTING.md) and open an issue/feature request before submitting PRs.