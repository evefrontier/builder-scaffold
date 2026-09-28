# zkLogin Helper

Interactive CLI that signs and executes Sui testnet transactions as your EVE Frontier game
account. The repo's `pnpm` scripts build unsigned transactions; this tool is where you sign
them. Nothing else in the repo holds your login.

## Setup

Requires **Node.js >= 22** and `pnpm`.

```bash
pnpm install
cp .env.example .env   # AUTH_URL, CLIENT_ID, ENOKI_API_KEY
pnpm zklogin
```

Salt and ZK proof come from [Enoki](https://portal.enoki.mystenlabs.com/). Use the same
Enoki app as EVE Vault: the salt determines your address, and a different app derives an
address that doesn't own your character. The tool checks the address it logs in as against
`ZKLOGIN_ADDRESS` in the repo-root `.env`, and stops if they differ.

## Flow

1. The tool generates an ephemeral key and prints a login URL
2. Open it, log in, and copy the `id_token` from the redirect URL (`https://sui.io/#id_token=eyJ...`)
3. Paste it when prompted — the tool fetches your salt and a ZK proof, valid for the session
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
| `AUTH_URL`, `CLIENT_ID` | EVE Frontier OAuth for the live tier |
| `ENOKI_API_KEY` | Enoki public API key |
| `SUI_NETWORK_URL` | Optional testnet fullnode override |
