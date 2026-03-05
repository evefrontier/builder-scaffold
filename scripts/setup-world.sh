#!/usr/bin/env bash
# setup-world: Pin world-contracts version, deploy, and copy artifacts.
#
# PURPOSE
#   Ensures the world package you deploy matches the version your extensions build against.
#   Without this script, you must manually checkout the right branch before deploy.
#
# WHAT IT DOES
#   1. Clones world-contracts to WORLD_CONTRACTS_DIR if it doesn't exist (or is empty)
#   2. Checkouts WORLD_CONTRACTS_BRANCH (and optionally WORLD_CONTRACTS_COMMIT)
#   3. For localnet + docker/.env.sui: generates world-contracts .env, imports admin key,
#      and switches the active Sui CLI address — no manual key setup needed
#   4. Deploys, configures, and seeds test resources
#   5. Copies deployments/, test-resources.json, Pub.localnet.toml into builder-scaffold
#
# BIND MOUNT (Docker)
#   In the Docker flow, world-contracts is bind-mounted (e.g. docker/world-contracts → /workspace/world-contracts).
#   This script operates on whatever path WORLD_CONTRACTS_DIR points at. When run inside the container,
#   set WORLD_CONTRACTS_DIR=/workspace/world-contracts. When run on the host (with sui client pointing
#   at the exposed node), use the host path to the same clone (e.g. docker/world-contracts). The script
#   checks out the branch/commit in that directory, then deploys from it — so the bind-mounted clone
#   is updated, and the container sees the same state.
#
# Usage:
#   pnpm setup-world
#   pnpm setup-world --clean    # clean artifacts before deploy
#   # or: ./scripts/setup-world.sh [--clean]
#
# Requires: .env with WORLD_CONTRACTS_BRANCH (default: main), optional WORLD_CONTRACTS_COMMIT
#           WORLD_CONTRACTS_COMMIT can be a commit SHA or a tag (e.g. v0.0.15); it overrides BRANCH
#           Latest stable tags: https://github.com/evefrontier/world-contracts/tags
#           WORLD_CONTRACTS_DIR (default: ../world-contracts) — path to world-contracts clone

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BUILDER_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$BUILDER_ROOT"

# Load .env if present
if [ -f .env ]; then
    set -a
    # shellcheck source=/dev/null
    source .env
    set +a
fi

CLEAN_BEFORE_DEPLOY=false
for arg in "$@"; do
    if [ "$arg" = "--clean" ]; then
        CLEAN_BEFORE_DEPLOY=true
        break
    fi
done

WORLD_DIR="${WORLD_CONTRACTS_DIR:-$BUILDER_ROOT/../world-contracts}"
if [ ! -d "$WORLD_DIR/.git" ]; then
    if [ -d "$WORLD_DIR" ] && [ -n "$(ls -A "$WORLD_DIR" 2>/dev/null)" ]; then
        echo "ERROR: $WORLD_DIR exists but is not a git repository."
        exit 1
    fi
    echo "=== Cloning world-contracts to $WORLD_DIR ==="
    mkdir -p "$(dirname "$WORLD_DIR")"
    git clone https://github.com/evefrontier/world-contracts.git "$WORLD_DIR"
fi

BRANCH="${WORLD_CONTRACTS_BRANCH:-main}"
COMMIT="${WORLD_CONTRACTS_COMMIT:-}"
NETWORK="${SUI_NETWORK:-localnet}"
DELAY_SECONDS="${DELAY_SECONDS:-2}"

REV="${COMMIT:-$BRANCH}"
echo "=== Checking out world-contracts: $REV ==="
cd "$WORLD_DIR"
git fetch origin
git checkout "$REV"

# When deploying to localnet and docker/.env.sui exists:
#   - Generate world-contracts .env from Docker keys if missing
#   - Import admin key into Sui CLI and switch active address
# This covers the "node in Docker, commands on host" flow automatically.
# Skipped for testnet (or any non-localnet) — manage your own keys in that case.
if [ "$NETWORK" = "localnet" ] && [ -f "$BUILDER_ROOT/docker/.env.sui" ]; then
    echo "=== Generating world-contracts .env from docker/.env.sui ==="
    bash "$BUILDER_ROOT/docker/scripts/generate-world-env.sh" "$WORLD_DIR"
    set -a; source <(sed 's/\r$//' "$BUILDER_ROOT/docker/.env.sui"); set +a
    echo "=== Importing admin key into Sui CLI ==="
    sui keytool import "$ADMIN_PRIVATE_KEY" ed25519 2>/dev/null || true
    echo "=== Switching active address to $ADMIN_ADDRESS ==="
    sui client switch --address "$ADMIN_ADDRESS"
elif [ ! -f "$WORLD_DIR/.env" ]; then
    echo "=== world-contracts/.env not found ==="
    cp "$WORLD_DIR/env.example" "$WORLD_DIR/.env"
    echo "Copied env.example to .env. Fill in ADMIN_ADDRESS, SPONSOR_ADDRESS,"
    echo "GOVERNOR_PRIVATE_KEY (or ADMIN_PRIVATE_KEY) in $WORLD_DIR/.env and run again."
    exit 1
fi

if [ "$CLEAN_BEFORE_DEPLOY" = true ]; then
    echo ""
    echo "=== Cleaning builder-scaffold artifacts (--clean) ==="
    bash "$BUILDER_ROOT/scripts/clean-world-artifacts.sh" --network "$NETWORK"
fi

echo ""
echo "=== Deploying world contracts ($NETWORK) ==="
pnpm install || { echo "ERROR: pnpm install failed"; exit 1; }
pnpm deploy-world "$NETWORK" || { echo "ERROR: deploy-world failed"; exit 1; }
sleep "$DELAY_SECONDS"

echo "=== Configuring world ==="
pnpm configure-world "$NETWORK" || { echo "ERROR: configure-world failed"; exit 1; }
sleep "$DELAY_SECONDS"

echo "=== Seeding test resources ==="
pnpm create-test-resources "$NETWORK" || { echo "ERROR: create-test-resources failed"; exit 1; }

echo ""
echo "=== Copying artifacts to builder-scaffold ==="
mkdir -p "$BUILDER_ROOT/deployments/$NETWORK"
cp -r deployments/* "$BUILDER_ROOT/deployments/"
cp test-resources.json "$BUILDER_ROOT/test-resources.json"
if [ -f "contracts/world/Pub.localnet.toml" ]; then
    cp "contracts/world/Pub.localnet.toml" "$BUILDER_ROOT/deployments/localnet/Pub.localnet.toml"
fi

EXTRACTED="$BUILDER_ROOT/deployments/$NETWORK/extracted-object-ids.json"
WORLD_PKG_ID=""
if [ -f "$EXTRACTED" ] && command -v jq &>/dev/null; then
    WORLD_PKG_ID=$(jq -r '.world.packageId // empty' "$EXTRACTED")
fi

echo ""
echo "Done. World at $REV deployed. Artifacts copied to $BUILDER_ROOT/deployments/"
if [ -n "$WORLD_PKG_ID" ]; then
    echo ""
    echo "WORLD_PACKAGE_ID=$WORLD_PKG_ID"
    echo "(auto-read from deployments/$NETWORK/extracted-object-ids.json — update .env only if you need to override this value manually)"
else
    echo "WORLD_PACKAGE_ID not found in extracted-object-ids.json. Set it manually in .env if needed."
fi
