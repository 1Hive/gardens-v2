#!/usr/bin/env bash
set -euo pipefail

: "${PK_DEPLOYER_PW:?missing PK_DEPLOYER_PW}"
: "${ETHERSCAN_API_KEY:?missing ETHERSCAN_API_KEY}"

ROOT_DIR="$(git rev-parse --show-toplevel)"
CONTRACTS_DIR="${ROOT_DIR}/pkg/contracts"
BASE_NETWORKS_JSON="${CONTRACTS_DIR}/config/networks.json"
TMP_DIR="${CONTRACTS_DIR}/.tmp"
LOCK_FILE="${TMP_DIR}/networks-json.lock"

mkdir -p "$TMP_DIR"

DEPLOYER_ADDRESS="$(cast wallet address --account PK_DEPLOYER --password "${PK_DEPLOYER_PW}")"

resolve_sig() {
  case "${PHASE:-all}" in
    ""|all)
      echo 'run(string)'
      ;;
    factory)
      case "${FACTORY_ACTION:-all}" in
        ""|all) echo 'runFactory(string)' ;;
        upgrade-impl|upgrade_impl) echo 'runFactoryUpgradeImpl(string)' ;;
        set-community-facets|set_community_facets) echo 'runFactorySetCommunityFacets(string)' ;;
        set-strategy-facets|set_strategy_facets) echo 'runFactorySetStrategyFacets(string)' ;;
        set-pause-controller|set_pause_controller) echo 'runFactorySetPauseController(string)' ;;
        set-registry-template|set_registry_template) echo 'runFactorySetRegistryTemplate(string)' ;;
        set-strategy-template|set_strategy_template) echo 'runFactorySetStrategyTemplate(string)' ;;
        *) echo "unsupported FACTORY_ACTION: ${FACTORY_ACTION}" >&2; return 1 ;;
      esac
      ;;
    communities)
      echo 'runCommunities(string)'
      ;;
    strategies)
      echo 'runStrategies(string)'
      ;;
    *)
      echo "unsupported PHASE: ${PHASE}" >&2
      return 1
      ;;
  esac
}

merge_network_config() {
  local network="$1"
  local tmp_networks_json="$2"
  local merged_json

  merged_json="$(mktemp "${TMP_DIR}/gardens-networks-merge-${network}-XXXXXX.json")"

  (
    flock -x 200
    jq --arg network "$network" --slurpfile updated "$tmp_networks_json" '
      .networks = (.networks | map(
        if .name == $network then ($updated[0].networks[] | select(.name == $network))
        else .
        end
      ))
    ' "$BASE_NETWORKS_JSON" > "$merged_json" && mv "$merged_json" "$BASE_NETWORKS_JSON"
  ) 200>"$LOCK_FILE"

  rm -f "$merged_json"
}

run_upgrade_network() {
  local network="$1"
  local rpc_url="$2"
  local chain_id="$3"
  local use_legacy="$4"
  local resume_flag=""
  local sig
  local tmp_networks_json
  local -a cmd

  sig="$(resolve_sig)"

  if [[ "${RESUME:-false}" == "true" ]]; then
    resume_flag="--resume"
  fi

  tmp_networks_json="$(mktemp "${TMP_DIR}/gardens-networks-${network}-XXXXXX.json")"
  cp "$BASE_NETWORKS_JSON" "$tmp_networks_json"

  cmd=(forge script script/UpgradeCVMultichain.s.sol:UpgradeCVMultichainScript
    --rpc-url "$rpc_url"
    --sig "$sig" "$network"
    --account PK_DEPLOYER
    --password "$PK_DEPLOYER_PW"
    --etherscan-api-key "$ETHERSCAN_API_KEY"
    --ffi
    --chain-id "$chain_id"
    --broadcast
    --slow
    -vvv)

  if [[ -n "$resume_flag" ]]; then
    cmd+=("$resume_flag")
  fi

  if [[ "$use_legacy" == "true" ]]; then
    cmd+=(--legacy)
  fi

  if NETWORKS_JSON_PATH="$tmp_networks_json" ETH_PASSWORD= DEPLOYER_ADDRESS="$DEPLOYER_ADDRESS" "${cmd[@]}"; then
    merge_network_config "$network" "$tmp_networks_json"
    rm -f "$tmp_networks_json"
    return 0
  fi

  rm -f "$tmp_networks_json"
  return 1
}

declare -a pids=()
declare -a names=()
failed=0

(
  run_upgrade_network ethereum "${RPC_URL_ETHEREUM}" 1 false
) & pids+=($!); names+=("ethereum")

(
  run_upgrade_network arbitrum "${RPC_URL_ARB}" 42161 false
) & pids+=($!); names+=("arbitrum")

(
  run_upgrade_network optimism "${RPC_URL_OPT}" 10 true
) & pids+=($!); names+=("optimism")

(
  run_upgrade_network polygon "${RPC_URL_POLYGON}" 137 true
) & pids+=($!); names+=("polygon")

(
  run_upgrade_network gnosis "${RPC_URL_GNOSIS}" 100 true
) & pids+=($!); names+=("gnosis")

(
  run_upgrade_network base "${RPC_URL_BASE}" 8453 true
) & pids+=($!); names+=("base")

(
  run_upgrade_network celo "${RPC_URL_CELO}" 42220 true
) & pids+=($!); names+=("celo")

for i in "${!pids[@]}"; do
  if wait "${pids[$i]}"; then
    echo "✅ ${names[$i]}: success"
  else
    echo "❌ ${names[$i]}: failed"
    failed=1
  fi
done

if task verify-all-mainnets; then
  echo "✅ all verification: success"
else
  echo "❌ all verification: failed"
  failed=1
fi

if [[ "$failed" -ne 0 ]]; then
  echo "One or more networks failed."
  exit 1
fi

echo "All networks succeeded."
