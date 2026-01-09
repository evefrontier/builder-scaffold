# zkLogin Helper

Interactive CLI for executing Sui transactions with zkLogin via EVE Frontier OAuth.

## Usage

pnpm install
pnpm zklogin

## Flow

1. Script generates ephemeral credentials and displays a login URL
2. Open the URL in your browser and log in
3. Copy the `id_token` from the redirect URL (`https://sui.io/#id_token=eyJ...`)
4. Paste the JWT when prompted
5. Optionally provide transaction bytes, or press Enter for a test transaction

## Config

Edit `zkLoginTransaction.ts` to change:
- `AUTH_URL` / `CLIENT_ID` - OAuth provider settings
- `SUI_NETWORK_URL` - Target Sui network (default: devnet)
- `PROVER_URL` - ZK prover endpoint