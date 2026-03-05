#!/usr/bin/env bash
# Populate world-contracts .env from docker/.env.sui keys.
# Usage: ./scripts/generate-world-env.sh [target-dir]
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BUILDER_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
TARGET_DIR="${1:-$BUILDER_ROOT/../world-contracts}"
ENV_SUI="$BUILDER_ROOT/docker/.env.sui"
ENV_EXAMPLE="$TARGET_DIR/env.example"
TARGET_ENV="$TARGET_DIR/.env"

[ -f "$ENV_SUI" ] || { echo "ERROR: $ENV_SUI not found. Start the container first." >&2; exit 1; }
[ -f "$ENV_EXAMPLE" ] || { echo "ERROR: $ENV_EXAMPLE not found. Clone world-contracts first." >&2; exit 1; }

set -a; source <(sed 's/\r$//' "$ENV_SUI"); set +a

for var in ADMIN_ADDRESS ADMIN_PRIVATE_KEY PLAYER_A_PRIVATE_KEY PLAYER_B_PRIVATE_KEY; do
  [ -n "${!var}" ] || { echo "ERROR: $var is empty in $ENV_SUI" >&2; exit 1; }
done

cp "$ENV_EXAMPLE" "$TARGET_ENV"
# Portable sed (macOS BSD sed -i differs from GNU sed)
apply_sed() {
  sed "$1" "$TARGET_ENV" > "$TARGET_ENV.tmp" && mv "$TARGET_ENV.tmp" "$TARGET_ENV"
}
apply_sed "s|^SUI_NETWORK=.*|SUI_NETWORK=${SUI_NETWORK:-localnet}|"
apply_sed "s|^ADMIN_ADDRESS=.*|ADMIN_ADDRESS=$ADMIN_ADDRESS|"
apply_sed "s|^SPONSOR_ADDRESS=.*|SPONSOR_ADDRESS=$ADMIN_ADDRESS|"
apply_sed "s|^ADMIN_PRIVATE_KEY=.*|ADMIN_PRIVATE_KEY=$ADMIN_PRIVATE_KEY|"
apply_sed "s|^GOVERNOR_PRIVATE_KEY=.*|GOVERNOR_PRIVATE_KEY=$ADMIN_PRIVATE_KEY|"
apply_sed "s|^PLAYER_A_PRIVATE_KEY=.*|PLAYER_A_PRIVATE_KEY=$PLAYER_A_PRIVATE_KEY|"
apply_sed "s|^PLAYER_B_PRIVATE_KEY=.*|PLAYER_B_PRIVATE_KEY=$PLAYER_B_PRIVATE_KEY|"

echo "Generated $TARGET_ENV from $ENV_SUI"
