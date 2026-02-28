#!/usr/bin/env bash
# Checkout a specific world-contracts branch/commit, deploy, and copy artifacts.
# Run from builder-scaffold root. Uses WORLD_CONTRACTS_BRANCH and WORLD_CONTRACTS_COMMIT from .env.
#
# Usage:
#   ./scripts/setup-world-with-version.sh
#
# Requires: .env with WORLD_CONTRACTS_BRANCH (default: main), optional WORLD_CONTRACTS_COMMIT
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

WORLD_DIR="${WORLD_CONTRACTS_DIR:-$BUILDER_ROOT/../world-contracts}"
if [ ! -d "$WORLD_DIR" ]; then
    echo "ERROR: world-contracts not found. Set WORLD_CONTRACTS_DIR or clone as sibling:"
    echo "  git clone https://github.com/evefrontier/world-contracts.git ../world-contracts"
    exit 1
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

echo ""
echo "Done. World at $REV deployed. Artifacts copied to $BUILDER_ROOT/deployments/"
echo "Set WORLD_PACKAGE_ID in .env from deployments/$NETWORK/extracted-object-ids.json (world.packageId)"
