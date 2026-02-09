#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/common.sh"

# One-time setup: start local node, create ADMIN/PLAYER_A/PLAYER_B, fund them
if [ ! -f "$WORKSPACE/.env.sui" ]; then
  "$WORKSPACE/setup-local.sh"
fi

# If container was restarted, ensure node is running
if [ -f "$WORKSPACE/.sui-node.pid" ]; then
  PID=$(cat "$WORKSPACE/.sui-node.pid")
  if ! kill -0 "$PID" 2>/dev/null; then
    echo "[sui-dev] Restarting local node..."
    sui start --with-faucet --force-regenesis &
    echo $! > "$WORKSPACE/.sui-node.pid"
    sleep 3
  fi
fi

echo ""
echo "Sui dev environment ready. RPC: http://127.0.0.1:9000"
echo "Addresses: see $WORKSPACE/.env.sui (ADMIN, PLAYER_A, PLAYER_B)"
echo "Mount move packages at $WORKSPACE/contracts and run: sui move build -e local && sui client publish -e local --gas-budget 100000000"
echo ""

exec "${@:-bash}"
