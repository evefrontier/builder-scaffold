#!/usr/bin/env bash
# Remove builder-scaffold world deployment artifacts (deployments/, test-resources.json).
# Use before a fresh deploy when switching world ref or after a chain reset.
#
# Usage:
#   pnpm clean-world
#   pnpm clean-world -- --network testnet
#   pnpm clean-world -- --all
#   ./scripts/clean-world-artifacts.sh [--network localnet|testnet] [--all]
#
# --network: clean only this network's deployment dir (default: SUI_NETWORK from .env or localnet)
# --all: remove entire deployments/ and test-resources.json
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BUILDER_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$BUILDER_ROOT"

if [ -f .env ]; then
  set -a
  # shellcheck source=/dev/null
  source <(grep -v '^#' .env | grep -v '^$' | sed 's/\r$//')
  set +a
fi

CLEAN_ALL=false
NETWORK="${SUI_NETWORK:-localnet}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --network)
      NETWORK="$2"
      shift 2
      ;;
    --all)
      CLEAN_ALL=true
      shift
      ;;
    *)
      echo "Unknown option: $1" >&2
      echo "Usage: $0 [--network localnet|testnet] [--all]" >&2
      exit 1
      ;;
  esac
done

echo "=== Cleaning world artifacts ==="

if [ "$CLEAN_ALL" = true ]; then
  rm -rf "$BUILDER_ROOT/deployments"
  echo "Removed $BUILDER_ROOT/deployments"
else
  rm -rf "$BUILDER_ROOT/deployments/$NETWORK"
  echo "Removed $BUILDER_ROOT/deployments/$NETWORK"
fi

if [ -f "$BUILDER_ROOT/test-resources.json" ]; then
  rm -f "$BUILDER_ROOT/test-resources.json"
  echo "Removed $BUILDER_ROOT/test-resources.json"
fi

echo "Done."
