#!/usr/bin/env bash
# Switch network: localnet (start node, use ADMIN keys) or testnet (stop node, import from .env.testnet).
# Usage: ./scripts/switch-network.sh [localnet|testnet]
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/common.sh"

SUI_CFG="${SUI_CONFIG_DIR:-$HOME/.sui}"
CLIENT_YAML="$SUI_CFG/client.yaml"
KEYSTORE="$SUI_CFG/sui.keystore"
LOCAL_RPC="http://127.0.0.1:9000"
TESTNET_RPC="${SUI_RPC_URL:-https://fullnode.testnet.sui.io}"
MODE="${1:-}"

if [ "$MODE" != "localnet" ] && [ "$MODE" != "testnet" ]; then
  echo "Usage: ./scripts/switch-network.sh [localnet|testnet]" >&2
  echo "  localnet - Start local node, use ADMIN/PLAYER_A/PLAYER_B keys" >&2
  echo "  testnet  - Stop local node, import keys from .env.testnet" >&2
  exit 1
fi

write_client_yaml() {
  local active_env="$1"
  local active_addr="$2"
  cat > "$CLIENT_YAML" << EOF
---
keystore:
  File: $KEYSTORE
envs:
  - alias: testnet
    rpc: "$TESTNET_RPC"
  - alias: localnet
    rpc: "$LOCAL_RPC"
active_env: $active_env
active_address: "$active_addr"
EOF
}

write_env_sui() {
  local network="$1"
  local rpc="$2"
  cat > "$WORKSPACE_DATA/.env.sui" << EOF
# Sui $network
SUI_NETWORK=$network
SUI_RPC_URL=$rpc
ADMIN_ADDRESS=$ADMIN
PLAYER_A_ADDRESS=$PLAYER_A
PLAYER_B_ADDRESS=$PLAYER_B
ADMIN_PRIVATE_KEY=$ADMIN_PRIVATE_KEY
PLAYER_A_PRIVATE_KEY=$PLAYER_A_PRIVATE_KEY
PLAYER_B_PRIVATE_KEY=$PLAYER_B_PRIVATE_KEY
EOF
  chmod 600 "$WORKSPACE_DATA/.env.sui"
}

if [ "$MODE" = "testnet" ]; then
  # Stop local node
  if [ -f "$WORKSPACE_DATA/.sui-node.pid" ]; then
    PID=$(cat "$WORKSPACE_DATA/.sui-node.pid")
    if kill -0 "$PID" 2>/dev/null; then
      echo "[sui-dev] Stopping local node (PID $PID)..."
      kill "$PID" 2>/dev/null || true
      sleep 2
    fi
    rm -f "$WORKSPACE_DATA/.sui-node.pid"
  fi

  # Import testnet keys
  ENV_TESTNET="$WORKSPACE/docker/.env.testnet"
  [ -f "$ENV_TESTNET" ] || ENV_TESTNET="$WORKSPACE/.env.testnet"
  if [ ! -f "$ENV_TESTNET" ]; then
    echo "[sui-dev] ERROR: Create docker/.env.testnet with ADMIN_PRIVATE_KEY, PLAYER_A_PRIVATE_KEY, PLAYER_B_PRIVATE_KEY" >&2
    exit 1
  fi
  set -a
  source <(crlf_clean "$ENV_TESTNET")
  set +a
  if [ -z "$ADMIN_PRIVATE_KEY" ] || [ -z "$PLAYER_A_PRIVATE_KEY" ] || [ -z "$PLAYER_B_PRIVATE_KEY" ]; then
    echo "[sui-dev] ERROR: .env.testnet must contain all three private keys" >&2
    exit 1
  fi

  mkdir -p "$SUI_CFG"
  sui keytool import "$ADMIN_PRIVATE_KEY" ed25519 --alias testnet-ADMIN 2>/dev/null || true
  sui keytool import "$PLAYER_A_PRIVATE_KEY" ed25519 --alias testnet-PLAYER_A 2>/dev/null || true
  sui keytool import "$PLAYER_B_PRIVATE_KEY" ed25519 --alias testnet-PLAYER_B 2>/dev/null || true

  ADMIN=$(sui keytool export --key-identity testnet-ADMIN --json 2>/dev/null | jq -r '.key.suiAddress')
  PLAYER_A=$(sui keytool export --key-identity testnet-PLAYER_A --json 2>/dev/null | jq -r '.key.suiAddress')
  PLAYER_B=$(sui keytool export --key-identity testnet-PLAYER_B --json 2>/dev/null | jq -r '.key.suiAddress')

  if [ -z "$ADMIN" ] || [ "$ADMIN" = "null" ] || [ -z "$PLAYER_A" ] || [ "$PLAYER_A" = "null" ] || [ -z "$PLAYER_B" ] || [ "$PLAYER_B" = "null" ]; then
    echo "[sui-dev] ERROR: Failed to import/export testnet keys. Check .env.testnet private keys are valid." >&2
    exit 1
  fi

  write_client_yaml "testnet" "$ADMIN"
  mkdir -p "$WORKSPACE_DATA"
  write_env_sui "testnet" "$TESTNET_RPC"
  echo "[sui-dev] Switched to testnet. sui client publish -e testnet --gas-budget 100000000"

else
  # localnet
  ADMIN=$(sui keytool export --key-identity ADMIN --json 2>/dev/null | jq -r '.key.suiAddress')
  if [ -z "$ADMIN" ] || [ "$ADMIN" = "null" ]; then
    echo "[sui-dev] ERROR: No localnet keys. Run sui-local first." >&2
    exit 1
  fi

  PLAYER_A=$(sui keytool export --key-identity PLAYER_A --json 2>/dev/null | jq -r '.key.suiAddress')
  PLAYER_B=$(sui keytool export --key-identity PLAYER_B --json 2>/dev/null | jq -r '.key.suiAddress')
  ADMIN_PRIVATE_KEY=$(sui keytool export --key-identity ADMIN 2>/dev/null | grep -oE 'suiprivkey1[a-z0-9]+' | head -1)
  PLAYER_A_PRIVATE_KEY=$(sui keytool export --key-identity PLAYER_A 2>/dev/null | grep -oE 'suiprivkey1[a-z0-9]+' | head -1)
  PLAYER_B_PRIVATE_KEY=$(sui keytool export --key-identity PLAYER_B 2>/dev/null | grep -oE 'suiprivkey1[a-z0-9]+' | head -1)

  write_client_yaml "localnet" "$ADMIN"
  mkdir -p "$WORKSPACE_DATA"
  write_env_sui "localnet" "$LOCAL_RPC"

  if need_start_local_node; then
    start_local_node_and_fund
  fi
  echo "[sui-dev] Switched to localnet"
fi
