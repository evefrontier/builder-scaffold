#!/usr/bin/env bash
set -e

export WORKSPACE=/workspace

# Ensure Sui CLI is on PATH
for d in /root/.local/bin /root/.suiup/bin /root/.suiup/current/bin; do
  [ -d "$d" ] && export PATH="$d:$PATH"
done
[ -d /root/.suiup ] && for d in /root/.suiup/*/bin; do [ -d "$d" ] && export PATH="$d:$PATH"; done || true

# Convert CRLF to LF for a file (handles Windows line endings)
crlf_clean() {
  sed 's/\r$//' "$1"
}
