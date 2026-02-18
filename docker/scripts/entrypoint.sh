#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/common.sh"

if [ "$SUI_NETWORK" != "local" ]; then
  echo "Usage: SUI_NETWORK=local (sui-local service)"
  exit 1
fi

mkdir -p "$WORKSPACE_DATA" 2>/dev/null || true

if [ ! -f "$WORKSPACE_DATA/.env.sui" ]; then
  "$WORKSPACE/scripts/setup-local.sh"
fi

if need_start_local_node; then
  start_local_node_and_fund
fi

echo ""
echo "Sui dev environment ready (local). RPC: http://127.0.0.1:9000"
echo "Keys and addresses: $WORKSPACE_DATA/.env.sui (includes private keys for TypeScript)"
echo ""
echo "Layout:"
echo "  /workspace/builder-scaffold/   – full builder-scaffold repo"
echo "  /workspace/world-contracts/    – clone world-contracts here (persistent volume)"
echo ""
echo "Quick start:"
echo "  cd /workspace/builder-scaffold/move-contracts/smart_gate"
echo "  sui move build -e local && sui client publish -e local"
echo ""
echo "Switch network: ./scripts/switch-network.sh [local|testnet]"
echo ""

exec "${@:-bash}"
