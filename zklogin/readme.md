# zkLogin Helper

Interactive CLI that signs and executes Sui testnet transactions as your EVE Frontier game
account. The repo's `pnpm` scripts build unsigned transactions; this tool is where you sign
them. Nothing else in the repo holds your login.

In a team sharing one account, only the team's signer runs this tool, on the same laptop that
runs the `pnpm` steps. See
[working as a team](../docs/building-on-existing-world.md#working-as-a-team).

## Setup

Requires **Node.js >= 22** and `pnpm`.

```bash
pnpm install
cp .env.example .env   # AUTH_URL, CLIENT_ID
pnpm zklogin
```

Your address and ZK proof come from the EVE Frontier API, through the same endpoints EVE
Vault uses, so you sign as the address EVE Vault shows you. The API picks the server from
your login. The tool stops if that server isn't the `TENANT` in the repo-root `.env`, or if
the address isn't its `ZKLOGIN_ADDRESS`.

## Flow

1. The tool generates an ephemeral key and prints a login URL
2. Open it, log in, and copy the whole redirect URL (`https://www.sui.io/#...&id_token=eyJ...`) — pasting just the `id_token` value also works
3. Paste it when prompted — the tool fetches your address and a ZK proof, valid for the session
4. For each transaction, choose how to supply it:
   - **[f]ile** — enter the path a `pnpm` step printed (e.g. `zklogin/pending/publish.tx`)
   - **[p]aste** — paste the bytes (base64 or comma-separated numbers)
   - **[t]est** — send 1 MIST to yourself, to check everything works
   - **e[x]it**

Each result is written to `last-tx.json` (digest, success, the error name if it aborted,
and created objects), which `pnpm tx-status` and `pnpm record-publish` read.

## Config

| Variable | |
|---|---|
| `AUTH_URL`, `CLIENT_ID` | EVE Frontier OAuth for the server `TENANT` points at (live for the workshop) |
| `EVE_API_URL` | Optional EVE Frontier API override; derived from your login by default |
| `SUI_NETWORK_URL` | Optional testnet fullnode override |
