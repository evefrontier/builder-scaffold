#!/usr/bin/env bash
# Generate world-contracts .env from the existing .env.sui keys.
# Usage: ./scripts/generate-world-env.sh [target-dir]
#   target-dir defaults to /workspace/world-contracts

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/common.sh"

TARGET_DIR="${1:-/workspace/world-contracts}"
ENV_SUI="$WORKSPACE_DATA/.env.sui"
TARGET_ENV="$TARGET_DIR/.env"

ENV_EXAMPLE="$TARGET_DIR/env.example"

if [ ! -f "$ENV_SUI" ]; then
  echo "ERROR: $ENV_SUI not found. Run the container first to generate keys." >&2
  exit 1
fi

if [ ! -f "$ENV_EXAMPLE" ]; then
  echo "ERROR: $ENV_EXAMPLE not found. Clone world-contracts first." >&2
  exit 1
fi

# Source the keys
set -a
source <(sed 's/\r$//' "$ENV_SUI")
set +a

NETWORK="${SUI_NETWORK:-localnet}"

# Start from env.example and fill in keys/addresses
cp "$ENV_EXAMPLE" "$TARGET_ENV"
sed -i "s|^SUI_NETWORK=.*|SUI_NETWORK=$NETWORK|" "$TARGET_ENV"
sed -i "s|^ADMIN_PRIVATE_KEY=.*|ADMIN_PRIVATE_KEY=$ADMIN_PRIVATE_KEY|" "$TARGET_ENV"
sed -i "s|^ADMIN_ADDRESS=.*|ADMIN_ADDRESS=$ADMIN_ADDRESS|" "$TARGET_ENV"
sed -i "s|^SPONSOR_ADDRESS=.*|SPONSOR_ADDRESS=$ADMIN_ADDRESS|" "$TARGET_ENV"
sed -i "s|^GOVERNOR_PRIVATE_KEY=.*|GOVERNOR_PRIVATE_KEY=$ADMIN_PRIVATE_KEY|" "$TARGET_ENV"
sed -i "s|^PLAYER_A_PRIVATE_KEY=.*|PLAYER_A_PRIVATE_KEY=$PLAYER_A_PRIVATE_KEY|" "$TARGET_ENV"
sed -i "s|^PLAYER_B_PRIVATE_KEY=.*|PLAYER_B_PRIVATE_KEY=$PLAYER_B_PRIVATE_KEY|" "$TARGET_ENV"

echo "Generated $TARGET_ENV (network=$NETWORK, sponsor=admin)"
