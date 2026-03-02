#!/usr/bin/env bash
# clean-world-artifacts: Remove builder-scaffold world deployment artifacts.
#
# Use before a fresh deploy when switching branches/commits to avoid stale
# deployments/, test-resources.json from previous runs.
#
# Usage:
#   ./scripts/clean-world-artifacts.sh           # clean SUI_NETWORK from .env
#   ./scripts/clean-world-artifacts.sh --network localnet
#   ./scripts/clean-world-artifacts.sh --all      # clean entire deployments/
#
# Requires: .env with SUI_NETWORK (default: localnet) when --network not passed

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
