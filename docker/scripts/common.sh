#!/usr/bin/env bash
set -e

export WORKSPACE=/workspace
export WORKSPACE_DATA="${WORKSPACE_DATA:-/workspace/data}"

# Ensure Sui CLI is on PATH
for d in /root/.local/bin /root/.suiup/bin /root/.suiup/current/bin; do
  [ -d "$d" ] && export PATH="$d:$PATH"
done
[ -d /root/.suiup ] && for d in /root/.suiup/*/bin; do [ -d "$d" ] && export PATH="$d:$PATH"; done || true

# Convert CRLF to LF for a file (handles Windows line endings)
crlf_clean() {
  sed 's/\r$//' "$1"
}

# Start local node with fresh genesis, wait for RPC.
start_local_node() {
  echo "[sui-dev] Starting local node..."
  sui start --with-faucet --force-regenesis &
  local pid=$!
  echo $pid > "$WORKSPACE_DATA/.sui-node.pid"
  echo "[sui-dev] Waiting for RPC on port 9000..."
  for i in $(seq 1 30); do
    if curl -s -o /dev/null http://127.0.0.1:9000 2>/dev/null; then
      echo "[sui-dev] RPC ready."
      break
    fi
    if [ "$i" -eq 30 ]; then
      echo "[sui-dev] RPC did not become ready." >&2
      kill $pid 2>/dev/null || true
      exit 1
    fi
    sleep 1
  done
  sleep 3
}

# Fund ADMIN, PLAYER_A, PLAYER_B from faucet.
fund_local_accounts() {
  echo "[sui-dev] Funding ADMIN, PLAYER_A, PLAYER_B from faucet..."
  for alias in ADMIN PLAYER_A PLAYER_B; do
    sui client switch --address "$alias"
    for attempt in 1 2 3; do
      sui client faucet 2>&1 && break
      [ "$attempt" -eq 3 ] && { echo "[sui-dev] Faucet failed for $alias" >&2; exit 1; }
      sleep 2
    done
  done
  sui client switch --address ADMIN
}

# Start local node and fund. Ensures client is on local env before funding.
start_local_node_and_fund() {
  start_local_node
  printf 'y\n' | sui client switch --env local 2>/dev/null || true
  fund_local_accounts
}

# Check if local node needs to be started (pid missing or process dead)
need_start_local_node() {
  if [ ! -f "$WORKSPACE_DATA/.sui-node.pid" ]; then
    return 0
  fi
  local pid
  pid=$(cat "$WORKSPACE_DATA/.sui-node.pid")
  if ! kill -0 "$pid" 2>/dev/null; then
    return 0
  fi
  return 1
}
