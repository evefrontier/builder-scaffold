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

## Local vs testnet

| | Local | Testnet |
|---|------|---------|
| **Use when** | Learning, testing, iteration | Testing with real network testnet |
| **Setup** | None | Add `.env.testnet` with your keys |
| **Accounts** | Pre-created ADMIN, PLAYER_A, PLAYER_B | Your own keys |

**To use testnet:** Create `docker/.env.testnet` with your Bech32 formatted private keys:

```
ADMIN_PRIVATE_KEY=suiprivkey1...
PLAYER_A_PRIVATE_KEY=suiprivkey1...
PLAYER_B_PRIVATE_KEY=suiprivkey1...
```

Then run `docker compose run --rm sui-testnet`. Do not commit `.env.testnet`.

## Useful commands inside the container

| Task | Command |
|------|---------|
| Build Move | `cd /workspace/contracts/gate && sui move build -e local` |
| Publish Move | `sui client publish -e local --gas-budget 100000000` |
| Run TypeScript | `cd /workspace/ts-scripts && npm install && npm run <script>` |
| Export key for TS | `sui keytool export --key-identity ADMIN` |

Env vars and addresses are in `/workspace/.env.sui`.

## Rebuild the image

```bash
docker compose build
```

## Troubleshooting

**Move.lock wrong env?** Run `rm Move.lock && sui move build -e local` (or `testnet`).

<details>
<summary>Windows PowerShell</summary>

Replace `$(pwd)` with `${PWD}` and use backticks (`` ` ``) for line continuation instead of `\`.
</details>
