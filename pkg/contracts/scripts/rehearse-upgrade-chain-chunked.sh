#!/usr/bin/env bash
set -euo pipefail

CHAIN="${1:-${CHAIN:-}}"
if [[ -z "$CHAIN" ]]; then
  echo "usage: $0 <chain>" >&2
  exit 1
fi

CONTRACTS_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO_ROOT="$(git -C "$CONTRACTS_ROOT" rev-parse --show-toplevel)"
cd "$CONTRACTS_ROOT"

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

: "${PK_DEPLOYER_PW:?missing PK_DEPLOYER_PW}"

case "$CHAIN" in
  ethsepolia) RPC_ENV="RPC_URL_SEP_TESTNET"; CHAIN_ID=11155111 ;;
  arbsepolia) RPC_ENV="RPC_URL_ARB_TESTNET"; CHAIN_ID=421614 ;;
  opsepolia) RPC_ENV="RPC_URL_OP_TESTNET"; CHAIN_ID=11155420 ;;
  ethereum) RPC_ENV="RPC_URL_ETHEREUM"; CHAIN_ID=1 ;;
  arbitrum) RPC_ENV="RPC_URL_ARB"; CHAIN_ID=42161 ;;
  optimism) RPC_ENV="RPC_URL_OPT"; CHAIN_ID=10 ;;
  polygon) RPC_ENV="RPC_URL_POLYGON"; CHAIN_ID=137 ;;
  gnosis) RPC_ENV="RPC_URL_GNOSIS"; CHAIN_ID=100 ;;
  base) RPC_ENV="RPC_URL_BASE"; CHAIN_ID=8453 ;;
  celo) RPC_ENV="RPC_URL_CELO"; CHAIN_ID=42220 ;;
  *) echo "unsupported CHAIN: $CHAIN" >&2; exit 1 ;;
esac

RPC_URL="${!RPC_ENV:-}"
if [[ -z "$RPC_URL" ]]; then
  echo "missing $RPC_ENV" >&2
  exit 1
fi

mkdir -p logs .tmp
TS="$(date -u +%Y%m%dT%H%M%SZ)"
LOG="${LOG:-logs/rehearse-upgrade-${CHAIN}-chunked-${TS}.outer.log}"
exec > >(tee "$LOG") 2>&1

echo "logging to $LOG"

task verify-storage

PORT="${ANVIL_PORT:-8545}"
LOCAL_RPC_URL="http://127.0.0.1:${PORT}"
DEPLOYER_ADDRESS="$(cast wallet address --account PK_DEPLOYER --password "$PK_DEPLOYER_PW")"
TMP_NETWORKS_JSON="$(mktemp "$CONTRACTS_ROOT/.tmp/gardens-networks-${CHAIN}-chunked-XXXXXX.json")"
cp "$CONTRACTS_ROOT/config/networks.json" "$TMP_NETWORKS_JSON"
echo "temp networks: $TMP_NETWORKS_JSON"

COMMUNITY_COUNT="$(NETWORKS_JSON_PATH="$TMP_NETWORKS_JSON" CHAIN="$CHAIN" node - <<'NODE'
const fs = require("fs");
const path = process.env.NETWORKS_JSON_PATH;
const chain = process.env.CHAIN;
const json = JSON.parse(fs.readFileSync(path, "utf8"));
const network = json.networks.find((item) => item.name === chain);
if (!network) throw new Error(`missing network ${chain}`);
console.log((network.PROXIES?.REGISTRY_COMMUNITIES || []).length);
NODE
)"
STRATEGY_COUNT="$(NETWORKS_JSON_PATH="$TMP_NETWORKS_JSON" CHAIN="$CHAIN" node - <<'NODE'
const fs = require("fs");
const path = process.env.NETWORKS_JSON_PATH;
const chain = process.env.CHAIN;
const json = JSON.parse(fs.readFileSync(path, "utf8"));
const network = json.networks.find((item) => item.name === chain);
if (!network) throw new Error(`missing network ${chain}`);
console.log((network.PROXIES?.CV_STRATEGIES || []).length);
NODE
)"
CHUNK_SIZE="${CHUNK_SIZE:-10}"
SCRIPT_TIMEOUT="${SCRIPT_TIMEOUT:-300s}"

echo "chain=$CHAIN chain_id=$CHAIN_ID communities=$COMMUNITY_COUNT strategies=$STRATEGY_COUNT chunk_size=$CHUNK_SIZE"

ANVIL_PID=""
cleanup() {
  if [[ -n "$ANVIL_PID" ]]; then
    kill "$ANVIL_PID" >/dev/null 2>&1 || true
    wait "$ANVIL_PID" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

anvil \
  --fork-url "$RPC_URL" \
  --chain-id "$CHAIN_ID" \
  --port "$PORT" \
  > "/tmp/gardens-rehearse-${CHAIN}-chunked-anvil.log" 2>&1 &
ANVIL_PID=$!

for attempt in $(seq 1 30); do
  if cast block-number --rpc-url "$LOCAL_RPC_URL" >/dev/null 2>&1; then
    break
  fi
  sleep 1
  if [[ "$attempt" -eq 30 ]]; then
    echo "anvil fork did not start" >&2
    exit 1
  fi
done

cast rpc --rpc-url "$LOCAL_RPC_URL" anvil_setBalance "$DEPLOYER_ADDRESS" 0x3635C9ADC5DEA00000 >/dev/null

run_forge_script() {
  local sig="$1"
  shift
  RUST_LOG=error timeout "$SCRIPT_TIMEOUT" forge script script/UpgradeCVMultichain.s.sol:UpgradeCVMultichainScript \
    --rpc-url "$LOCAL_RPC_URL" \
    --sig "$sig" "$CHAIN" \
    --account PK_DEPLOYER \
    --password "$PK_DEPLOYER_PW" \
    --chain-id "$CHAIN_ID" \
    --ffi \
    --broadcast \
    --skip-simulation \
    --disable-labels \
    -q \
    "$@"
}

echo "refresh facets"
NETWORKS_JSON_PATH="$TMP_NETWORKS_JSON" ETH_PASSWORD= DEPLOYER_ADDRESS="$DEPLOYER_ADDRESS" \
  RUST_LOG=error timeout "$SCRIPT_TIMEOUT" forge script script/RefreshFacetSnapshots.s.sol:RefreshFacetSnapshots \
    --rpc-url "$LOCAL_RPC_URL" \
    --sig "run(string)" "$CHAIN" \
    --account PK_DEPLOYER \
    --password "$PK_DEPLOYER_PW" \
    --chain-id "$CHAIN_ID" \
    --ffi \
    --broadcast \
    --skip-simulation \
    --disable-labels \
    -q
echo "refresh facets ok"

echo "factory"
NETWORKS_JSON_PATH="$TMP_NETWORKS_JSON" ETH_PASSWORD= DEPLOYER_ADDRESS="$DEPLOYER_ADDRESS" \
  run_forge_script "runFactory(string)"
echo "factory ok"

start=0
while [[ "$start" -lt "$COMMUNITY_COUNT" ]]; do
  end=$((start + CHUNK_SIZE))
  if [[ "$end" -gt "$COMMUNITY_COUNT" ]]; then
    end="$COMMUNITY_COUNT"
  fi
  echo "communities ${start}-${end}"
  NETWORKS_JSON_PATH="$TMP_NETWORKS_JSON" ETH_PASSWORD= DEPLOYER_ADDRESS="$DEPLOYER_ADDRESS" \
    COMMUNITY_START_INDEX="$start" COMMUNITY_END_INDEX="$end" \
    run_forge_script "runCommunities(string)"
  echo "communities ${start}-${end} ok"
  start="$end"
done

start=0
while [[ "$start" -lt "$STRATEGY_COUNT" ]]; do
  end=$((start + CHUNK_SIZE))
  if [[ "$end" -gt "$STRATEGY_COUNT" ]]; then
    end="$STRATEGY_COUNT"
  fi
  echo "strategies ${start}-${end}"
  NETWORKS_JSON_PATH="$TMP_NETWORKS_JSON" ETH_PASSWORD= DEPLOYER_ADDRESS="$DEPLOYER_ADDRESS" \
    STRATEGY_START_INDEX="$start" STRATEGY_END_INDEX="$end" \
    run_forge_script "runStrategies(string)"
  echo "strategies ${start}-${end} ok"
  start="$end"
done

echo "smoke"
NETWORKS_JSON_PATH="$TMP_NETWORKS_JSON" FORK_HEALTHCHECK_CHAIN="$CHAIN" FORK_HEALTHCHECK_RPC_URL="$LOCAL_RPC_URL" \
  forge test --match-contract ForkLifecycleHealthcheck "${SMOKE_VERBOSITY:--vvv}"
echo "smoke ok"
