# Sui development environment (Docker)

One container with **Sui CLI**, **Node.js**, and a local Sui node. No need to install anything on your machine—everything runs inside Docker.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) installed

## Quick start

**Step 1:** From the `docker` directory, run:

```bash
docker compose run --rm sui-local
```

On first run, the container will start a local node and create three funded accounts: `ADMIN`, `PLAYER_A`, and `PLAYER_B`. This takes a minute or two.

**Step 2:** You’re inside the docker container. At the prompt, try:

```bash
# Build a Move package
cd /workspace/contracts/gate
sui move build -e local
```

Your `move-contracts` and `ts-scripts` folders are mounted—edit files on your host and run commands in the container.

On first run, `docker/workspace-data` is created and holds `.env.sui` with addresses and private keys (persists across container restarts).

## Local vs testnet

Both modes use the same `sui-local` container. Enter with `docker compose run --rm sui-local`, then switch networks from inside the container.

| Usage | Local | Testnet |
|--------|------|---------|
| **Use when** | Learning, testing, iteration | Testing with real network |
| **Setup** | None | Add `docker/.env.testnet` with your keys |
| **Accounts** | Pre-created ADMIN, PLAYER_A, PLAYER_B | Your own keys |

**Switch network** (inside container): `./scripts/switch-network.sh [local|testnet]`
- `testnet`: Stops local node, imports keys from `docker/.env.testnet` (aliases: testnet-ADMIN, etc.)
- `local`: Starts fresh chain, funds from faucet, uses ADMIN/PLAYER_A/PLAYER_B keys

For testnet, create `docker/.env.testnet` with Bech32 keys (ADMIN_PRIVATE_KEY, PLAYER_A_PRIVATE_KEY, PLAYER_B_PRIVATE_KEY). Do not commit.

## Useful commands inside the container

| Task | Command |
|------|---------|
| Build Move | `cd /workspace/contracts/gate && sui move build -e local` |
| Publish Move | `sui client publish -e local --gas-budget 100000000` |
| Run TypeScript | `cd /workspace/ts-scripts && npm install && npm run <script>` |
| View keys | `cat /workspace/data/.env.sui` |
| Switch network | `./scripts/switch-network.sh local` or `./scripts/switch-network.sh testnet` |

Env vars, addresses, and private keys are in `/workspace/data/.env.sui`. For TypeScript, `source /workspace/data/.env.sui` or copy the vars into `ts-scripts/.env`. Do not commit `workspace-data`.

## Rebuild the image

```bash
docker compose build
```

## Clean up / Fresh start

To reset keystore and workspace data (new keys, fix corrupted config). Run from the `docker` directory:

```bash
rm -rf workspace-data
docker compose build
docker volume rm docker_sui-keystore 2>/dev/null || true
docker compose run --rm sui-local
```

## Connect from host (e.g. world-contracts in another terminal)

Port **9000** is published so you can use `sui client` on your machine against the node in the container.

1. **Wait for the node** — In the container terminal, wait until you see `[sui-dev] RPC ready.`.
2. **Point your client at the node** — On the host, use an env whose RPC is `http://127.0.0.1:9000` (e.g. `sui client switch --env localnet` if that alias is set to 127.0.0.1:9000).
3. If you want the same addresses as in the container, import the keys from `docker/workspace-data/.env.sui` into your host’s Sui config or `.env` for scripts.

## Troubleshooting

**Move.lock wrong env?** Run `rm Move.lock && sui move build -e local` (or `testnet`).

<details>
<summary>Windows PowerShell</summary>

Replace `$(pwd)` with `${PWD}` and use backticks (`` ` ``) for line continuation instead of `\`.
</details>
