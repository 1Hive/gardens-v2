#!/usr/bin/env bash
set -euo pipefail

CHAIN="${1:-${CHAIN:-}}"
if [[ -z "$CHAIN" ]]; then
  echo "usage: $0 <chain>" >&2
  exit 1
fi

CONTRACTS_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$CONTRACTS_ROOT"

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

: "${PK_DEPLOYER_PW:?missing PK_DEPLOYER_PW}"

case "$CHAIN" in
  ethsepolia) RPC_ENV="RPC_URL_SEP_TESTNET"; CHAIN_ID=11155111; USE_LEGACY=false; USE_SLOW=false ;;
  arbsepolia) RPC_ENV="RPC_URL_ARB_TESTNET"; CHAIN_ID=421614; USE_LEGACY=false; USE_SLOW=false ;;
  opsepolia) RPC_ENV="RPC_URL_OP_TESTNET"; CHAIN_ID=11155420; USE_LEGACY=false; USE_SLOW=false ;;
  ethereum) RPC_ENV="RPC_URL_ETHEREUM"; CHAIN_ID=1; USE_LEGACY=false; USE_SLOW=true ;;
  arbitrum) RPC_ENV="RPC_URL_ARB"; CHAIN_ID=42161; USE_LEGACY=false; USE_SLOW=true ;;
  optimism) RPC_ENV="RPC_URL_OPT"; CHAIN_ID=10; USE_LEGACY=true; USE_SLOW=true ;;
  polygon) RPC_ENV="RPC_URL_POLYGON"; CHAIN_ID=137; USE_LEGACY=true; USE_SLOW=true ;;
  gnosis) RPC_ENV="RPC_URL_GNOSIS"; CHAIN_ID=100; USE_LEGACY=true; USE_SLOW=true ;;
  base) RPC_ENV="RPC_URL_BASE"; CHAIN_ID=8453; USE_LEGACY=true; USE_SLOW=true ;;
  celo) RPC_ENV="RPC_URL_CELO"; CHAIN_ID=42220; USE_LEGACY=true; USE_SLOW=true ;;
  *) echo "unsupported CHAIN: $CHAIN" >&2; exit 1 ;;
esac

RPC_URL="${!RPC_ENV:-}"
if [[ -z "$RPC_URL" ]]; then
  echo "missing $RPC_ENV" >&2
  exit 1
fi

mkdir -p logs
TS="$(date -u +%Y%m%dT%H%M%SZ)"
LOG="${LOG:-logs/upgrade-${CHAIN}-chunked-${TS}.log}"
exec > >(tee "$LOG") 2>&1

echo "logging to $LOG"
task verify-storage
task sync-proxies NETWORK="$CHAIN"

NETWORKS_JSON="$CONTRACTS_ROOT/config/networks.json"
COMMUNITY_COUNT="$(NETWORKS_JSON_PATH="$NETWORKS_JSON" CHAIN="$CHAIN" node - <<'NODE'
const fs = require("fs");
const json = JSON.parse(fs.readFileSync(process.env.NETWORKS_JSON_PATH, "utf8"));
const network = json.networks.find((item) => item.name === process.env.CHAIN);
if (!network) throw new Error(`missing network ${process.env.CHAIN}`);
console.log((network.PROXIES?.REGISTRY_COMMUNITIES || []).length);
NODE
)"
STRATEGY_COUNT="$(NETWORKS_JSON_PATH="$NETWORKS_JSON" CHAIN="$CHAIN" node - <<'NODE'
const fs = require("fs");
const json = JSON.parse(fs.readFileSync(process.env.NETWORKS_JSON_PATH, "utf8"));
const network = json.networks.find((item) => item.name === process.env.CHAIN);
if (!network) throw new Error(`missing network ${process.env.CHAIN}`);
console.log((network.PROXIES?.CV_STRATEGIES || []).length);
NODE
)"

CHUNK_SIZE="${CHUNK_SIZE:-20}"
SCRIPT_TIMEOUT="${SCRIPT_TIMEOUT:-1800s}"
COMMUNITY_START_AT="${COMMUNITY_START_AT:-0}"
STRATEGY_START_AT="${STRATEGY_START_AT:-0}"
DEPLOYER_ADDRESS="$(cast wallet address --account PK_DEPLOYER --password "$PK_DEPLOYER_PW")"

declare -a COMMON_ARGS=(
  --rpc-url "$RPC_URL"
  --account PK_DEPLOYER
  --password "$PK_DEPLOYER_PW"
  --chain-id "$CHAIN_ID"
  --ffi
  --broadcast
  --offline
  --disable-labels
  -q
)
if [[ "$USE_SLOW" == "true" ]]; then
  COMMON_ARGS+=(--slow)
fi
if [[ "${SKIP_SIMULATION:-true}" == "true" ]]; then
  COMMON_ARGS+=(--skip-simulation)
fi
if [[ "$USE_LEGACY" == "true" ]]; then
  BASE_GAS_WEI="$(cast gas-price --rpc-url "$RPC_URL")"
  LEGACY_GAS_MULTIPLIER_BPS="${LEGACY_GAS_MULTIPLIER_BPS:-14000}"
  GAS_PRICE_WEI_VALUE="${GAS_PRICE_WEI:-$(( (BASE_GAS_WEI * LEGACY_GAS_MULTIPLIER_BPS + 9999) / 10000 ))}"
  if [[ "$GAS_PRICE_WEI_VALUE" -le "$BASE_GAS_WEI" ]]; then
    GAS_PRICE_WEI_VALUE=$((BASE_GAS_WEI + 1))
  fi
  echo "Using legacy gas price: ${GAS_PRICE_WEI_VALUE} wei (RPC estimate: ${BASE_GAS_WEI} wei)"
  COMMON_ARGS+=(--legacy --with-gas-price "$GAS_PRICE_WEI_VALUE")
fi

run_cv_upgrade() {
  local sig="$1"
  shift
  ETH_PASSWORD= DEPLOYER_ADDRESS="$DEPLOYER_ADDRESS" \
    timeout "$SCRIPT_TIMEOUT" forge script script/UpgradeCVMultichain.s.sol:UpgradeCVMultichainScript \
      --sig "$sig" "$CHAIN" "${COMMON_ARGS[@]}" "$@"
}

if [[ "${REFRESH_FACETS:-true}" == "true" ]]; then
  echo "refresh facets"
  ETH_PASSWORD= DEPLOYER_ADDRESS="$DEPLOYER_ADDRESS" \
    timeout "$SCRIPT_TIMEOUT" forge script script/RefreshFacetSnapshots.s.sol:RefreshFacetSnapshots \
      --sig "run(string)" "$CHAIN" "${COMMON_ARGS[@]}"
  echo "refresh facets ok"
fi

if [[ "${UPGRADE_SECURITY_SINGLETONS:-true}" == "true" ]]; then
  echo "security singletons"
  ETH_PASSWORD= DEPLOYER_ADDRESS="$DEPLOYER_ADDRESS" \
    timeout "$SCRIPT_TIMEOUT" forge script script/UpgradeSecuritySingletons.s.sol:UpgradeSecuritySingletons \
      --sig "run(string)" "$CHAIN" "${COMMON_ARGS[@]}"
  echo "security singletons ok"
fi

if [[ "${SKIP_FACTORY:-false}" != "true" ]]; then
  echo "factory"
  run_cv_upgrade "runFactory(string)"
  echo "factory ok"
fi

start="$COMMUNITY_START_AT"
while [[ "$start" -lt "$COMMUNITY_COUNT" ]]; do
  end=$((start + CHUNK_SIZE))
  if [[ "$end" -gt "$COMMUNITY_COUNT" ]]; then
    end="$COMMUNITY_COUNT"
  fi
  echo "communities ${start}-${end}"
  REUSE_CONFIGURED_IMPLEMENTATIONS=true SKIP_FACET_DEPLOYMENT=true \
    COMMUNITY_START_INDEX="$start" COMMUNITY_END_INDEX="$end" \
    run_cv_upgrade "runCommunities(string)"
  echo "communities ${start}-${end} ok"
  start="$end"
done

start="$STRATEGY_START_AT"
while [[ "$start" -lt "$STRATEGY_COUNT" ]]; do
  end=$((start + CHUNK_SIZE))
  if [[ "$end" -gt "$STRATEGY_COUNT" ]]; then
    end="$STRATEGY_COUNT"
  fi
  echo "strategies ${start}-${end}"
  REUSE_CONFIGURED_IMPLEMENTATIONS=true SKIP_FACET_DEPLOYMENT=true MIGRATE_THRESHOLD_SNAPSHOTS=true \
    STRATEGY_START_INDEX="$start" STRATEGY_END_INDEX="$end" \
    run_cv_upgrade "runStrategies(string)"
  echo "strategies ${start}-${end} ok"
  start="$end"
done

echo "verify"
VERIFY_COMMAND_TIMEOUT="${VERIFY_COMMAND_TIMEOUT:-1200}" \
  ./scripts/verify-all-deployments.sh --scope all --network "$CHAIN"
echo "verify ok"
