# Builder flow: host

Run the builder-scaffold flow on your host machine, targeting **testnet** or a **local network**. The same steps work for any extension example (**smart_gate**, **storage_unit**, or your own); this guide uses **smart_gate** for the publish and run-scripts steps.

> **Prefer Docker?** See [builder-flow-docker.md](./builder-flow-docker.md) to run the full flow inside a container with no host tooling required.

## 1. Prerequisites

- [Sui CLI](https://docs.sui.io/guides/developer/getting-started/sui-install), Node.js, and pnpm installed on your host
  - suiup is recommended for easy upgrades on sui versions
  - Install pnpm `npm i -g pnpm`
- For testnet: funded accounts (e.g. from [Sui testnet faucet](https://faucet.sui.io/))
- For local: a running Sui local node (see below)

## 2. Clone builder-scaffold (if needed)

If you haven’t already, run the [common clone step](../README.md#quickstart) from the main README:

```bash
mkdir -p workspace && cd workspace
git clone https://github.com/evefrontier/builder-scaffold.git
cd builder-scaffold
```

## 3. Choose your network

**Testnet** — no extra setup, just set your cli to the right network.

**Local** — you need a local Sui node running on port 9000.

<details>
<summary>Local node setup</summary>

**Using Docker:**

```bash
cd docker
docker compose run --rm --service-ports sui-dev
```

Import the container's keys from `docker/.env.sui` into your host config.

**Using Sui CLI directly:**

```bash
sui start --with-faucet --force-regenesis
```

Then point your host Sui CLI at the local node:

```bash
sui client new-env --alias localnet --rpc http://127.0.0.1:9000
```
</details>


```bash
sui client switch --env localnet   # or testnet
```

## 4. Make sure the keys are funded

You need the same keys in three places: Sui keytool (for publish), world-contracts `.env`, and builder-scaffold `.env`.

**If you use the Docker local node** (from step 3):

- Use the 3 keys in `docker/.env.sui`; import them into keytool and copy into both `.env` files. Localnet auto-funds them; for testnet, fund all 3 via the faucet.

**If you use your own node** (e.g. `sui start --with-faucet` on host):

- Create 3 accounts (ADMIN, Player A, Player B) **either** by:
  - **Generating new addresses** with Sui CLI (recommended):
    - `sui client new-address ed25519 --alias admin`
    - `sui client new-address ed25519 --alias player-a`
    - `sui client new-address ed25519 --alias player-b`
    - These create key pairs in the Sui keystore; **no import into keytool is needed**.
  - **Or** importing existing private keys into keytool (if you already have them):
    - `sui keytool import <PRIVATE_KEY_BASE64> ed25519 --alias admin` (and similarly for `player-a`, `player-b`).
- Fund all 3 accounts (local: use `sui client faucet`; testnet: [Sui testnet faucet](https://faucet.sui.io/)).
- Get addresses for your aliases (for `.env` and for switching accounts): `sui client addresses` (or `sui keytool list`).
- If your `.env` files need private keys, export from keytool: `sui keytool export --key admin` (and similarly for `player-a`, `player-b`).
- Switch to the ADMIN account for publishing: `sui client switch --address <ADMIN_ADDRESS>`.
- Set these keys and addresses in world-contracts `.env` and builder-scaffold `.env` (see steps 5 and 7).


## 5. Deploy world and create test resources

> **Coming soon:** These manual steps will be simplified into a single setup command. See [setup-world/readme.md](../setup-world/readme.md) for details.

From your workspace directory (parent of `builder-scaffold`), clone `world-contracts` at the stable tag as a sibling and deploy:

**Before running the commands below set these environment variables in these [world-contracts/.env](world-contracts/.env) file:**
- `SUI_NETWORK` = testnet (or localnet)
- `ADMIN_ADDRESS` = "sui client active-address"
- `SPONSOR_ADDRESS` = "sui client active-address" can be the same as `ADMIN_ADDRESS`
- `ADMIN_PRIVATE_KEY` = "sui keytool export --key-identity <ADMIN_ADDRESS>" and copy the `exportedPrivateKey` (`suiprivkeyXYZ`)
- `PLAYER_A_PRIVATE_KEY` = Create another wallet and get private key and fund it
- `PLAYER_B_PRIVATE_KEY` = Create another wallet and get private key and fund it
- `GOVERNOR_PRIVATE_KEY` (OPTIONAL) = "sui client active-address" can be the same as `ADMIN_PRIVATE_KEY`

**ATTENTION:**
The ADMIN_PRIVATE_KEY must have at least 5 sui.

```bash
cd ..   # workspace (parent of builder-scaffold)
git clone -b v0.0.14 https://github.com/evefrontier/world-contracts.git
cd world-contracts
cp env.example .env
# Set SUI_NETWORK=testnet (or localnet) and fill in your keys
# For development, ADMIN_ADDRESS and SPONSOR_ADDRESS can be the same
# GOVERNOR_PRIVATE_KEY is optional or can be the same as ADMIN_PRIVATE_KEY
pnpm install
pnpm deploy-world testnet       # or localnet
pnpm configure-world testnet    # or localnet
pnpm create-test-resources testnet   # or localnet
```

Check all the created resources in the explorer:
- [localnet explorer](https://custom.suiscan.xyz/custom/checkpoints?network=http%3A%2F%2Flocalhost%3A9000)
- [devnet explorer](https://suiscan.xyz/devnet/)
- [testnet explorer](https://suiscan.xyz/testnet/)
- [mainnet explorer](https://suiscan.xyz/)

## 6. Copy world artifacts into builder-scaffold

```bash
NETWORK=localnet   # or testnet
mkdir -p ../builder-scaffold/deployments/$NETWORK/
cp -r deployments/* ../builder-scaffold/deployments/
cp test-resources.json ../builder-scaffold/test-resources.json
cp "contracts/world/Pub.localnet.toml" "../builder-scaffold/deployments/localnet/Pub.localnet.toml"
```

## 7. Configure builder-scaffold .env

```bash
cd ../builder-scaffold
cp .env.example .env
```

Set the following in `.env`:
- Same keys/addresses as world-contracts
- `SUI_NETWORK=testnet` (or `localnet`)
- `WORLD_PACKAGE_ID` — from `deployments/<network>/extracted-object-ids.json` (`world.packageId`)

## 8. Publish custom contract

Pick an example (e.g. **smart_gate** or **storage_unit**); use its folder in `move-contracts/`:

1. In `Move.toml` replace `"../../../world-contracts/contracts/world"` with the `source.local` value in `deployments/localnet/Pub.localnet.toml`
2. Delete the `Move.lock` file

```bash
cd move-contracts/smart_gate   # or storage_unit, or your package
sui client publish --build-env testnet   # testnet
sui client test-publish --build-env testnet --pubfile-path ../../deployments/localnet/Pub.localnet.toml   # localnet
```

Set `BUILDER_PACKAGE_ID` and `EXTENSION_CONFIG_ID` in `.env` from the publish output.
Those values are in the output of the publish command:
1. `BUILDER_PACKAGE_ID` = changed_objects.objectId where objectType === "package"
2. `EXTENSION_CONFIG_ID` = changed_objects.objectId where objectType ends with "config::ExtensionConfig"

## 9. Run scripts

For the **smart_gate** example (scripts are in the repo root):

```bash
cd ../..   # builder-scaffold root
pnpm install
pnpm configure-rules
pnpm authorise-gate
pnpm authorise-storage-unit
pnpm issue-tribe-jump-permit
pnpm jump-with-permit
pnpm collect-corpse-bounty
```
