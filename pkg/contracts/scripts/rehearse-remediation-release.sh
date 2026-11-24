#!/usr/bin/env bash
# Apply ordered candidate payloads on a disposable fork, then assert release behavior.
set -euo pipefail
chain=${1:?Usage: scripts/rehearse-remediation-release.sh <network>}
cd "$(dirname "$0")/.."
if [[ -f .env ]]; then set -a; source .env; set +a; fi
case "$chain" in
  ethsepolia) rpc=${RPC_URL_SEP_TESTNET:-}; chain_id=11155111 ;;
  arbsepolia) rpc=${RPC_URL_ARB_TESTNET:-}; chain_id=421614 ;;
  opsepolia) rpc=${RPC_URL_OP_TESTNET:-}; chain_id=11155420 ;;
  arbitrum) rpc=${RPC_URL_ARB:-}; chain_id=42161 ;;
  optimism) rpc=${RPC_URL_OPT:-}; chain_id=10 ;;
  polygon) rpc=${RPC_URL_POLYGON:-}; chain_id=137 ;;
  gnosis) rpc=${RPC_URL_GNOSIS:-}; chain_id=100 ;;
  base) rpc=${RPC_URL_BASE:-}; chain_id=8453 ;;
  celo) rpc=${RPC_URL_CELO:-}; chain_id=42220 ;;
  ethereum) rpc=${RPC_URL_ETHEREUM:-}; chain_id=1 ;;
  *) echo "Unsupported network" >&2; exit 1 ;;
esac
: "${rpc:?RPC URL missing}"
dir=transaction-builder/remediation-candidates
files=("$dir/$chain-strategy-release.json" "$dir/$chain-community-release.json")
if [[ -f "$dir/$chain-escrow-release.json" ]]; then files+=("$dir/$chain-escrow-release.json"); fi
for file in "${files[@]}"; do [[ -f $file ]] || { echo "Missing $file" >&2; exit 1; }; done
port=${ANVIL_PORT:-18545}
local_rpc="http://127.0.0.1:$port"
log_file=$(mktemp)
chmod 600 "$log_file"
anvil --fork-url "$rpc" --chain-id "$chain_id" --port "$port" --silent > "$log_file" 2>&1 &
anvil_pid=$!
cleanup() { kill "$anvil_pid" 2>/dev/null || true; wait "$anvil_pid" 2>/dev/null || true; rm -f "$log_file"; }
trap cleanup EXIT
for attempt in $(seq 1 30); do
  if cast block-number --rpc-url "$local_rpc" >/dev/null 2>&1; then break; fi
  if ! kill -0 "$anvil_pid" 2>/dev/null; then
    echo "Anvil exited before fork was ready" >&2
    sed -E 's#https?://[^[:space:]]+#<RPC_URL>#g' "$log_file" | tail -15 >&2
    exit 1
  fi
  sleep 1
done
cast block-number --rpc-url "$local_rpc" >/dev/null
USE_EXISTING_ANVIL=true ANVIL_PORT="$port" SKIP_SMOKE=true bash scripts/rehearse-safe-payload.sh "$chain" "${files[@]}"
node scripts/verify-remediation-release-fork.mjs --network "$chain" --baseline-rpc "$rpc" --fork-rpc "$local_rpc"
