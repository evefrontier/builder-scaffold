#!/usr/bin/env bash
# Clone world-contracts (if needed), checkout ref, deploy, configure, create test
# resources, and copy artifacts into builder-scaffold.
#
# Usage: from builder-scaffold root:
#   pnpm setup-world
#   pnpm setup-world -- --clean   # clean artifacts then deploy (e.g. after chain reset or ref change)
#   ./scripts/setup-world.sh [--clean]
#
# Requires .env (or env) with SUI_NETWORK. Optional: WORLD_CONTRACTS_REF,
# WORLD_CONTRACTS_REPO, WORLD_CONTRACTS_DIR. See .env.example.
# Works for both Docker (localnet: auto .env + key switch) and host (use world-contracts/.env).
set -euo pipefail

# Resolve builder-scaffold root and workspace (parent)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCAFFOLD_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
WORKSPACE="$(cd "$SCAFFOLD_ROOT/.." && pwd)"

# Load builder-scaffold .env so WORLD_CONTRACTS_* and SUI_NETWORK are available
if [ -f "$SCAFFOLD_ROOT/.env" ]; then
  set -a
  # shellcheck source=/dev/null
  source <(grep -v '^#' "$SCAFFOLD_ROOT/.env" | grep -v '^$' | sed 's/\r$//')
  set +a
fi

WORLD_CONTRACTS_REPO="${WORLD_CONTRACTS_REPO:-https://github.com/evefrontier/world-contracts.git}"
# Default stable tag; override in .env to e.g. main or another tag/commit for bleeding edge
WORLD_CONTRACTS_REF="${WORLD_CONTRACTS_REF:-v0.0.14}"
WORLD_CONTRACTS_DIR="${WORLD_CONTRACTS_DIR:-$WORKSPACE/world-contracts}"
NETWORK="${SUI_NETWORK:-localnet}"
DELAY_SECONDS="${DELAY_SECONDS:-2}"

CLEAN_BEFORE_DEPLOY=false
for arg in "$@"; do
  if [ "$arg" = "--clean" ]; then
    CLEAN_BEFORE_DEPLOY=true
    break
  fi
done

echo "=== World setup (ref=$WORLD_CONTRACTS_REF, network=$NETWORK) ==="

if [ ! -d "$WORLD_CONTRACTS_DIR" ]; then
  echo "Cloning world-contracts into $WORLD_CONTRACTS_DIR ..."
  git clone "$WORLD_CONTRACTS_REPO" "$WORLD_CONTRACTS_DIR"
fi

cd "$WORLD_CONTRACTS_DIR"
git fetch origin "$WORLD_CONTRACTS_REF" 2>/dev/null || true
git checkout "$WORLD_CONTRACTS_REF"

# Docker (localnet): generate world-contracts .env from container keys and set Sui CLI active address
ENV_SUI="$SCAFFOLD_ROOT/docker/.env.sui"
GEN_SCRIPT="$SCAFFOLD_ROOT/docker/scripts/generate-world-env.sh"
if [ "$NETWORK" = "localnet" ] && [ -f "$ENV_SUI" ] && [ -f "$GEN_SCRIPT" ]; then
  echo "Generating world-contracts .env from container keys ..."
  bash "$GEN_SCRIPT" "$WORLD_CONTRACTS_DIR"
  set -a; source <(grep -v '^#' "$ENV_SUI" | grep -v '^$' | sed 's/\r$//'); set +a
  # Entrypoint already created keys and set active address to ADMIN; ensure we're still on admin for deploy
  echo "Switching Sui CLI to admin address ..."
  sui client switch --address "$ADMIN_ADDRESS"
else
  if [ ! -f "$WORLD_CONTRACTS_DIR/.env" ]; then
    if [ -f "$WORLD_CONTRACTS_DIR/env.example" ]; then
      cp "$WORLD_CONTRACTS_DIR/env.example" "$WORLD_CONTRACTS_DIR/.env"
      echo "Created $WORLD_CONTRACTS_DIR/.env from env.example."
      echo "  Edit it (SUI_NETWORK, keys, addresses), then run pnpm setup-world again."
    else
      echo "ERROR: $WORLD_CONTRACTS_DIR/.env missing and env.example not found."
      exit 1
    fi
    exit 0
  fi
fi

if [ "$CLEAN_BEFORE_DEPLOY" = true ]; then
  echo "=== Cleaning builder-scaffold artifacts (--clean) ==="
  bash "$SCAFFOLD_ROOT/scripts/clean-world-artifacts.sh" --network "$NETWORK"
fi

echo "=== Deploying and configuring world ($NETWORK) ==="
pnpm install
pnpm deploy-world "$NETWORK"
sleep "$DELAY_SECONDS"
pnpm configure-world "$NETWORK"
sleep "$DELAY_SECONDS"
pnpm create-test-resources "$NETWORK"

echo "=== Copying artifacts into builder-scaffold ==="
mkdir -p "$SCAFFOLD_ROOT/deployments/$NETWORK"
cp -r "$WORLD_CONTRACTS_DIR/deployments/"* "$SCAFFOLD_ROOT/deployments/"
cp "$WORLD_CONTRACTS_DIR/test-resources.json" "$SCAFFOLD_ROOT/test-resources.json"
if [ -f "$WORLD_CONTRACTS_DIR/contracts/world/Pub.$NETWORK.toml" ]; then
  cp "$WORLD_CONTRACTS_DIR/contracts/world/Pub.$NETWORK.toml" "$SCAFFOLD_ROOT/deployments/$NETWORK/Pub.$NETWORK.toml"
fi

echo "Done. World ref=$WORLD_CONTRACTS_REF; artifacts in $SCAFFOLD_ROOT/deployments/ and test-resources.json"
