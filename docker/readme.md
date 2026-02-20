# Sui development environment (Docker)

One container with **Sui CLI**, **Node.js**, and **pnpm**. No host tooling needed.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) installed

## Quick start

```bash
cd docker
docker compose run --rm sui-dev
```

On first run the container creates three ed25519 keypairs (`ADMIN`, `PLAYER_A`, `PLAYER_B`). Keys persist across container restarts via a Docker volume.

Every start spins up a fresh local Sui node and funds the accounts from the faucet.

## Workspace layout

```
/workspace/
├── builder-scaffold/    # full repo (syncs with host)
└── world-contracts/     # bind mount — clone here on host, visible inside container
```

Edit files on your host, run commands in the container:

```bash
cd /workspace/builder-scaffold/move-contracts/smart_gate
sui move build -e testnet
```
> **Why `-e testnet` even for local builds?** The localnet chain ID changes on every restart, so you can't pin it in `Move.toml`. Using testnet as the build environment resolves dependencies correctly while publishing to your local node via [ephemeral publication](https://docs.sui.io/guides/developer/packages/move-package-management#test-publish).

## Using testnet

The container starts on **localnet**, but you can use testnet the same way you would on your host machine:

```bash
sui client switch --env testnet

# Fund your local keys on testnet by requesting gas
https://faucet.sui.io/

# Or import separate testnet keys if you prefer
sui keytool import <your-private-key> ed25519
```

## Bring your own keys

If you want to use existing keys instead of the auto-generated ones:

```bash
sui keytool import <your-private-key> ed25519 --alias my-key
sui client switch --env testnet
sui client switch --address <your-address>
```

For TS scripts and world-contracts, manually fill in the `.env` files with your own keys and addresses instead of using `generate-world-env.sh`.

## Useful commands

| Task | Command |
|------|---------|
| View keys | `cat /workspace/builder-scaffold/docker/.env.sui` |
| List addresses | `sui client addresses` |
| Switch network | `sui client switch --env testnet` |
| Import a key | `sui keytool import <key> ed25519` |
| Stop local node | `pkill -f "sui start"` |
| Generate world-contracts .env | `./scripts/generate-world-env.sh` |
| Build a contract | `cd /workspace/builder-scaffold/move-contracts/smart_gate && sui move build -e testnet` |
| Run TS scripts | `cd /workspace/builder-scaffold && pnpm configure-rules` |

## Connect to local node from host

Port **9000** is published. On your host:

```bash
sui client new-env --alias localnet --rpc http://127.0.0.1:9000
sui client switch --env localnet
```

Wait until the container logs `RPC ready` before connecting. Import keys from `docker/.env.sui` if needed.

## Clean up / fresh start

```bash
docker volume rm docker_sui-config 2>/dev/null || true
docker compose build
docker compose run --rm sui-dev
```

<details>
<summary>Troubleshooting</summary>

1. Move.lock wrong env? `rm Move.lock && sui move build --build-env testnet`

2. "Unpublished dependencies: World"?

![publish error](../images/publish-error.png)

Deploy world-contracts first (see [builder-flow-docker.md](../docs/builder-flow-docker.md#4-deploy-world-and-create-test-resources)), then pass its publication file:

```bash
sui client test-publish --build-env testnet --pubfile-path ../../../world-contracts/contracts/world/Pub.localnet.toml
```

</details>

<details>
<summary>Windows PowerShell</summary>

Replace `$(pwd)` with `${PWD}` and use backticks (`` ` ``) for line continuation instead of `\`.
</details>
