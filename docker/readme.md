# Sui development environment (Docker)

One container with **Sui CLI**, **Node.js**, and **pnpm**. No host tooling needed.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) installed

## Quick start

```bash
docker compose run --rm sui-local
```

On first run the container starts a local Sui node and creates three funded accounts (`ADMIN`, `PLAYER_A`, `PLAYER_B`). Keys are saved to `docker/workspace-data/.env.sui`.

Once inside the container, the workspace layout is:

```
/workspace/
├── builder-scaffold/    # full repo (syncs with host)
├── world-contracts/     # bind mount — clone here (syncs with host)
├── data/                # keys, .env.sui
└── scripts/             # entrypoint + helpers
```

Edit files on your host, run commands in the container:

```bash
cd /workspace/builder-scaffold/move-contracts/smart_gate
sui move build -e testnet
```

## Testnet and local

The container starts on **localnet** by default, but **testnet is the practical default for building** — world package addresses resolve automatically with `--build-env testnet`.

| | Testnet | Local |
|---|---------|-------|
| **Use when** | Building and testing contracts | Offline iteration (requires world-contracts deployed locally) |
| **Setup** | Add `docker/.env.testnet` with your Bech32 keys | Deploy world-contracts to local node first |
| **Accounts** | Your own keys | Pre-created ADMIN, PLAYER_A, PLAYER_B |

> **Why `--build-env testnet` even for local builds?** The localnet chain ID changes on every restart, so you can't pin it in `Move.toml`. Using testnet as the build environment resolves dependencies correctly while publishing to your local node via [ephemeral publication](https://docs.sui.io/guides/developer/packages/move-package-management#test-publish).

**Switch network** (inside container):

```bash
./scripts/switch-network.sh testnet    # stops local node, imports keys from docker/.env.testnet
./scripts/switch-network.sh localnet   # starts fresh chain, funds from faucet
```

For testnet, create `docker/.env.testnet` with `ADMIN_PRIVATE_KEY`, `PLAYER_A_PRIVATE_KEY`, `PLAYER_B_PRIVATE_KEY`. Do not commit this file.

## Useful commands

| Task | Command |
|------|---------|
| View keys | `cat /workspace/data/.env.sui` |
| Switch network | `./scripts/switch-network.sh testnet` |
| Build a contract | `cd /workspace/builder-scaffold/move-contracts/smart_gate && sui move build -e testnet` |
| Run TS scripts | `cd /workspace/builder-scaffold && pnpm configure-rules` |

## Clean up / fresh start

```bash
rm -rf workspace-data world-contracts
docker volume rm docker_sui-keystore 2>/dev/null || true
docker compose build
docker compose run --rm sui-local
```

## Connect to local node from host

Port **9000** is published. On your host:

```bash
sui client new-env --alias localnet --rpc http://127.0.0.1:9000
sui client switch --env localnet
```

Wait until the container logs `[sui-dev] RPC ready.` before connecting. Import keys from `docker/workspace-data/.env.sui` if needed.

<details>
<summary>Troubleshooting </summary>

1. Move.lock wrong env? `rm Move.lock && sui move build --build-env testnet`

2. "Unpublished dependencies: World"? Deploy world-contracts first (see [builder-flow-docker.md](../docs/builder-flow-docker.md#4-deploy-world-and-create-test-resources)), then pass its publication file:

```bash
sui client test-publish --build-env testnet --pubfile-path ../../../world-contracts/contracts/world/Pub.localnet.toml
```

</details>

<details>
<summary>Windows PowerShell</summary>

Replace `$(pwd)` with `${PWD}` and use backticks (`` ` ``) for line continuation instead of `\`.
</details>
