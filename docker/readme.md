# Sui development environment (Docker)

Single container with **Sui CLI**, **local node**, **Node.js**, and three funded ed25519 accounts (**ADMIN**, **PLAYER_A**, **PLAYER_B**). Use it to build and deploy Move packages and run TypeScript without installing Sui on your host.

## Build

```bash
docker build -t sui-local .
```

## Run with shell

Mount your Move packages and get an interactive shell with the local node and keys ready:

```bash
docker run -it --rm \
  -v "$(pwd)/../move-contracts:/workspace/contracts" \
  -v "$(pwd)/../ts-scripts:/workspace/scripts" \
  sui-local
```

Inside the container:

- **RPC:** `http://127.0.0.1:9000`
- **Addresses / env:** `/workspace/.env.sui` (ADMIN, PLAYER_A, PLAYER_B)
- **Build & deploy any Move package** (e.g. from mounted `move-contracts`). Use `-e local` so the CLI’s chain ID is ignored (local net gets a new chain ID each run):

  ```bash
  cd /workspace/contracts/gate
  sui move build -e local
  sui client publish -e local --gas-budget 100000000
  ```

  If you see **"Environment \`local\` is not present in Move.toml"**, the package was previously built for another env and `Move.lock` is pinning it. Remove the lock and rebuild: `rm Move.lock && sui move build -e local`.

- **Run TypeScript** (after `npm install` in your script dir):

  ```bash
  cd /workspace/scripts
  npm install
  # use SUI_RPC_URL=http://127.0.0.1:9000 and addresses from /workspace/.env.sui
  node your-script.js
  ```


## What runs on startup

1. **First run only:** start local Sui node, create three ed25519 keypairs (ADMIN, PLAYER_A, PLAYER_B), request gas from the faucet for each, write `/workspace/.env.sui`.
2. **Later runs:** if the node PID is gone, the node is restarted.
3. Then the container runs your command or `bash`.

## Contents

- **Base image:** `mysten/sui-tools:testnet` (Sui CLI + node).
- **Node.js:** 20 LTS for TypeScript/JS scripts.
- **No local Sui install needed:** all `sui` and `node` usage happens inside the container.
