#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/common.sh"

if [ "$SUI_NETWORK" != "local" ] && [ "$SUI_NETWORK" != "testnet" ]; then
  echo "Usage: set SUI_NETWORK to 'local' or 'testnet', e.g.:"
  echo "  docker run -it --rm -e SUI_NETWORK=local -v ... sui-local"
  echo "  docker run -it --rm -e SUI_NETWORK=testnet -v ... sui-local"
  exit 1
fi

if [ "$SUI_NETWORK" = "local" ]; then
  if [ ! -f "$WORKSPACE/.env.sui" ]; then
    "$WORKSPACE/scripts/setup-local.sh"
  fi

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
  echo "Sui dev environment ready (local). RPC: http://127.0.0.1:9000"
  echo "Addresses: see $WORKSPACE/.env.sui (ADMIN, PLAYER_A, PLAYER_B)"
  echo "Mount move packages at $WORKSPACE/contracts and run: sui move build -e local && sui client publish -e local --gas-budget 100000000"
  echo ""
else
  if [ ! -f "$WORKSPACE/.env.sui" ]; then
    "$WORKSPACE/scripts/setup-testnet.sh"
  fi

  echo ""
  echo "Sui dev environment ready (testnet). RPC: see $WORKSPACE/.env.sui"
  echo "Deploy: sui move build -e testnet && sui client publish -e testnet --gas-budget 100000000"
  echo ""
fi

exec "${@:-bash}"
