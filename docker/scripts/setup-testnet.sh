#!/usr/bin/env bash
# Testnet: import keys from .env.testnet, write .env.sui.
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/common.sh"

SUI_CFG="${SUI_CONFIG_DIR:-$HOME/.sui}"
CLIENT_YAML="$SUI_CFG/client.yaml"
TESTNET_RPC="${SUI_RPC_URL:-https://fullnode.testnet.sui.io}"

# Ensure client config exists so keytool/switch can run (avoids "create one [Y/n]?" prompt)
if [ ! -f "$CLIENT_YAML" ]; then
  echo "[sui-dev] Creating minimal Sui client config (testnet, no key)..."
  mkdir -p "$SUI_CFG"
  printf '%s' '[]' > "$SUI_CFG/sui.keystore"
  cat > "$CLIENT_YAML" << 'MINIMAL'
---
keystore:
  File: SUI_CFG_PLACEHOLDER/sui.keystore
envs:
  - alias: testnet
    rpc: "https://fullnode.testnet.sui.io:443"
active_env: testnet
active_address: ~
MINIMAL
  sed -i "s|SUI_CFG_PLACEHOLDER|$SUI_CFG|g" "$CLIENT_YAML"
fi

sui client switch --env testnet 2>/dev/null || true

# .env.sui when keys are missing (no .env.testnet or incomplete keys)
if [ -f "$WORKSPACE/.env.testnet" ]; then
  set -a
  source <(crlf_clean "$WORKSPACE/.env.testnet")
  set +a
fi
if [ ! -f "$WORKSPACE/.env.testnet" ] || [ -z "$ADMIN_PRIVATE_KEY" ] || [ -z "$PLAYER_A_PRIVATE_KEY" ] || [ -z "$PLAYER_B_PRIVATE_KEY" ]; then
  cat > "$WORKSPACE/.env.sui" << EOF
# Sui testnet – add .env.testnet with ADMIN_PRIVATE_KEY, PLAYER_A_PRIVATE_KEY, PLAYER_B_PRIVATE_KEY
SUI_NETWORK=testnet
SUI_RPC_URL=$TESTNET_RPC
EOF
  echo "[sui-dev] Wrote $WORKSPACE/.env.sui (RPC only). Add .env.testnet with three Bech32 private keys for ADMIN, PLAYER_A, PLAYER_B."
  exit 0
fi

echo "[sui-dev] Importing ADMIN, PLAYER_A, PLAYER_B from .env.testnet..."
ADMIN=$(sui keytool import "$ADMIN_PRIVATE_KEY" ed25519 --alias ADMIN 2>&1 | grep -oE '0x[0-9a-fA-F]{64}' | head -1)
PLAYER_A=$(sui keytool import "$PLAYER_A_PRIVATE_KEY" ed25519 --alias PLAYER_A 2>&1 | grep -oE '0x[0-9a-fA-F]{64}' | head -1)
PLAYER_B=$(sui keytool import "$PLAYER_B_PRIVATE_KEY" ed25519 --alias PLAYER_B 2>&1 | grep -oE '0x[0-9a-fA-F]{64}' | head -1)

cat > "$CLIENT_YAML" << EOF
---
keystore:
  File: $SUI_CFG/sui.keystore
envs:
  - alias: testnet
    rpc: "https://fullnode.testnet.sui.io:443"
active_env: testnet
active_address: "$ADMIN"
EOF

cat > "$WORKSPACE/.env.sui" << EOF
# Sui testnet – from .env.testnet keys
SUI_NETWORK=testnet
SUI_RPC_URL=$TESTNET_RPC
ADMIN_ADDRESS=$ADMIN
PLAYER_A_ADDRESS=$PLAYER_A
PLAYER_B_ADDRESS=$PLAYER_B
EOF
echo "[sui-dev] Wrote $WORKSPACE/.env.sui with ADMIN, PLAYER_A, PLAYER_B addresses."
echo "[sui-dev] For balance/publish use addresses from $WORKSPACE/.env.sui if needed."
