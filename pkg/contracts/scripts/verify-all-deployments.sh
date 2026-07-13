#!/usr/bin/env bash
set -euo pipefail
unset CHAIN

CONTRACTS_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NETWORKS=()
SCOPE="all"
VERIFY_RPC_MAX_ATTEMPTS=${VERIFY_RPC_MAX_ATTEMPTS:-4}
VERIFY_RPC_INITIAL_DELAY=${VERIFY_RPC_INITIAL_DELAY:-8}
VERIFY_RPC_SUCCESS_DELAY=${VERIFY_RPC_SUCCESS_DELAY:-2}
VERIFY_COMMAND_TIMEOUT=${VERIFY_COMMAND_TIMEOUT:-300}
VERIFY_REPLAY_OFFLINE=${VERIFY_REPLAY_OFFLINE:-true}

is_retryable_rpc_error() {
  grep -Eqi 'rate limit|max calls per sec|429|timeout|temporar|failed to get storage|no state found for block number|HTTP error 429|Max retries exceeded' <<< "$1"
}

run_with_rpc_retry() {
  local description="$1"
  shift

  local attempt=1
  local delay="$VERIFY_RPC_INITIAL_DELAY"
  local output

  while true; do
    if [[ "$(type -t "$1" || true)" == "function" ]]; then
      output="$("$@" 2>&1)"
      local status=$?
    else
      output="$(timeout --foreground "$VERIFY_COMMAND_TIMEOUT" "$@" 2>&1)"
      local status=$?
    fi

    if [[ "$status" -eq 0 ]]; then
      printf '%s\n' "$output"
      sleep "$VERIFY_RPC_SUCCESS_DELAY"
      return 0
    fi

    printf '%s\n' "$output" >&2
    if [[ "$status" -eq 124 ]]; then
      echo "Command timed out after ${VERIFY_COMMAND_TIMEOUT}s while running $description" >&2
    fi

    if [[ "$attempt" -ge "$VERIFY_RPC_MAX_ATTEMPTS" ]]; then
      return 1
    fi

    if [[ "$status" -eq 124 ]] || is_retryable_rpc_error "$output"; then
      echo "Retrying $description after ${delay}s (attempt $((attempt + 1))/${VERIFY_RPC_MAX_ATTEMPTS})..." >&2
      sleep "$delay"
      attempt=$((attempt + 1))
      delay=$((delay * 2))
      continue
    fi

    return 1
  done
}

cooldown_after_network() {
  if [[ "$VERIFY_RPC_SUCCESS_DELAY" -gt 0 ]]; then
    sleep "$VERIFY_RPC_SUCCESS_DELAY"
  fi
}

usage() {
  cat <<'USAGE'
Usage: scripts/verify-all-deployments.sh [--scope <scope>] [--network <name>]...

Scopes:
  all         Run global + state + factory + communities + strategies + facets
  global      Run pause + escrow verifiers
  state       Verify live contract state against config/networks.json
  pause       Run only global pause controller verifier
  escrow      Run only streaming escrow + escrow factory verifiers
  factory     Run factory verification (skips pre/postflight)
  communities Run community verification (skips pre/postflight)
  strategies  Run strategy verification (skips pre/postflight)
  facets      Run diamond facet verifier
  diamonds    Alias for facets

Multiple scopes may be passed as a comma-separated list, for example:
  --scope global,diamonds

Examples:
  scripts/verify-all-deployments.sh
  scripts/verify-all-deployments.sh --scope global
  scripts/verify-all-deployments.sh --scope facets --network arbitrum --network base
  scripts/verify-all-deployments.sh --scope pause,escrow --network optimism
  scripts/verify-all-deployments.sh --scope state --network arbitrum
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --scope)
      SCOPE="$2"
      shift 2
      ;;
    --network)
      NETWORKS+=("$2")
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage
      exit 1
      ;;
  esac
done

if [[ ${#NETWORKS[@]} -eq 0 ]]; then
  NETWORKS=(ethereum arbitrum optimism polygon gnosis base celo)
fi

declare -A REQUESTED_SCOPES=()

IFS=',' read -r -a scope_items <<< "$SCOPE"
for item in "${scope_items[@]}"; do
  scope_name="$(echo "$item" | xargs)"
  case "$scope_name" in
    all)
      REQUESTED_SCOPES[global]=1
      REQUESTED_SCOPES[state]=1
      REQUESTED_SCOPES[factory]=1
      REQUESTED_SCOPES[communities]=1
      REQUESTED_SCOPES[strategies]=1
      REQUESTED_SCOPES[facets]=1
      ;;
    global|state|pause|escrow|factory|communities|strategies|facets|diamonds)
      if [[ "$scope_name" == "diamonds" ]]; then
        scope_name="facets"
      fi
      REQUESTED_SCOPES["$scope_name"]=1
      ;;
    *)
      echo "Unsupported scope: $scope_name" >&2
      usage
      exit 1
      ;;
  esac
done

run_global_scope() {
  local only="$1"
  local cmd=(bash "$CONTRACTS_ROOT/scripts/verify-global-deployments.sh" --only "$only")

  for network in "${NETWORKS[@]}"; do
    cmd+=(--network "$network")
  done

  echo "==> Running global verifier (scope=$only)"
  local output
  local status
  if output="$(timeout --foreground "$VERIFY_COMMAND_TIMEOUT" "${cmd[@]}" 2>&1)"; then
    printf '%s\n' "$output"
    return 0
  fi

  status=$?
  printf '%s\n' "$output" >&2
  if [[ "$status" -eq 124 ]]; then
    echo "Command timed out after ${VERIFY_COMMAND_TIMEOUT}s while running global verifier" >&2
  fi
  return "$status"
}

run_state_scope() {
  local failed=0

  echo "==> Running config/state verifier"

  for network in "${NETWORKS[@]}"; do
    local rpc_url
    local network_chain_id
    local cmd

    rpc_url="$(rpc_url_for_network "$network")" || {
      echo "❌ $network state"
      failed=1
      continue
    }
    network_chain_id="$(chain_id "$network")"

    if [[ -z "$rpc_url" || -z "$network_chain_id" ]]; then
      echo "❌ $network state"
      failed=1
      continue
    fi

    echo "### $network"
    cmd=(forge script script/VerifyNetworkConfigState.s.sol:VerifyNetworkConfigState
      --rpc-url "$rpc_url"
      --sig "run(string)" "$network"
      --ffi
      --chain-id "$network_chain_id")

    if run_with_rpc_retry "$network state" "${cmd[@]}"; then
      echo "✅ $network state"
      cooldown_after_network
    else
      local alternate_rpc_url=""
      alternate_rpc_url="$(alternate_rpc_url_for_network "$network")" || true
      if [[ -n "$alternate_rpc_url" ]]; then
        cmd=(forge script script/VerifyNetworkConfigState.s.sol:VerifyNetworkConfigState
          --rpc-url "$alternate_rpc_url"
          --sig "run(string)" "$network"
          --ffi
          --chain-id "$network_chain_id")

        if run_with_rpc_retry "$network state (alternate RPC)" "${cmd[@]}"; then
          echo "✅ $network state"
          cooldown_after_network
          continue
        fi
      fi

      echo "❌ $network state"
      failed=1
    fi
  done

  return "$failed"
}

run_diamond_scope() {
  local failed=0

  echo "==> Running facet verifier"
  for network in "${NETWORKS[@]}"; do
    local rpc_url
    local network_chain_id

    rpc_url="$(rpc_url_for_network "$network")" || {
      echo "❌ $network facets"
      failed=1
      continue
    }
    network_chain_id="$(chain_id "$network")"

    if [[ -z "$rpc_url" || -z "$network_chain_id" ]]; then
      echo "❌ $network facets"
      failed=1
      continue
    fi

    echo "### $network"
    if run_with_rpc_retry "$network facets" bash "$CONTRACTS_ROOT/scripts/verify-diamond-facets.sh" \
      --network "$network" \
      --rpc-url "$rpc_url" \
      --chain-id "$network_chain_id"; then
      echo "✅ $network facets"
      cooldown_after_network
    else
      local alternate_rpc_url=""
      alternate_rpc_url="$(alternate_rpc_url_for_network "$network")" || true
      if [[ -n "$alternate_rpc_url" ]]; then
        if run_with_rpc_retry "$network facets (alternate RPC)" bash "$CONTRACTS_ROOT/scripts/verify-diamond-facets.sh" \
          --network "$network" \
          --rpc-url "$alternate_rpc_url" \
          --chain-id "$network_chain_id"; then
          echo "✅ $network facets"
          cooldown_after_network
          continue
        fi
      fi

      echo "❌ $network facets"
      failed=1
    fi
  done

  return "$failed"
}

rpc_env_name() {
  case "$1" in
    ethsepolia) echo "RPC_URL_SEP_TESTNET" ;;
    arbsepolia) echo "RPC_URL_ARB_TESTNET" ;;
    opsepolia) echo "RPC_URL_OP_TESTNET" ;;
    arbitrum) echo "RPC_URL_ARB" ;;
    optimism) echo "RPC_URL_OPT" ;;
    ethereum) echo "RPC_URL_ETHEREUM" ;;
    polygon) echo "RPC_URL_POLYGON" ;;
    gnosis) echo "RPC_URL_GNOSIS" ;;
    base) echo "RPC_URL_BASE" ;;
    celo) echo "RPC_URL_CELO" ;;
    *) return 1 ;;
  esac
}

premium_rpc_env_name() {
  case "$1" in
    ethsepolia) echo "PREMIUM_RPC_URL_SEP_TESTNET" ;;
    arbsepolia) echo "PREMIUM_RPC_URL_ARB_TESTNET" ;;
    opsepolia) echo "PREMIUM_RPC_URL_OP_TESTNET" ;;
    arbitrum) echo "PREMIUM_RPC_URL_ARB" ;;
    optimism) echo "PREMIUM_RPC_URL_OPT" ;;
    ethereum) echo "PREMIUM_RPC_URL_ETHEREUM" ;;
    polygon) echo "PREMIUM_RPC_URL_POLYGON" ;;
    gnosis) echo "PREMIUM_RPC_URL_GNOSIS" ;;
    base) echo "PREMIUM_RPC_URL_BASE" ;;
    celo) echo "PREMIUM_RPC_URL_CELO" ;;
    *) return 1 ;;
  esac
}

rpc_url_for_network() {
  local network="$1"
  local premium_var=""
  local primary_var=""

  premium_var="$(premium_rpc_env_name "$network")" || true
  primary_var="$(rpc_env_name "$network")" || return 1

  if [[ -n "$premium_var" && -n "${!premium_var:-}" ]]; then
    echo "${!premium_var}"
    return 0
  fi

  echo "${!primary_var:-}"
}

alternate_rpc_url_for_network() {
  local network="$1"
  local premium_var=""
  local primary_var=""

  premium_var="$(premium_rpc_env_name "$network")" || true
  primary_var="$(rpc_env_name "$network")" || return 1

  if [[ -n "$premium_var" && -n "${!premium_var:-}" && -n "${!primary_var:-}" && "${!premium_var}" != "${!primary_var}" ]]; then
    echo "${!primary_var}"
    return 0
  fi

  return 1
}

proxy_owner_address() {
  jq -r --arg n "$1" '.networks[] | select(.name == $n) | .ENVS.PROXY_OWNER // empty' "$CONTRACTS_ROOT/config/networks.json"
}

configured_sender_address() {
  jq -r --arg n "$1" '.networks[] | select(.name == $n) | .ENVS.SENDER // empty' "$CONTRACTS_ROOT/config/networks.json"
}

configured_cv_strategy_address() {
  jq -r --arg n "$1" '.networks[] | select(.name == $n) | .IMPLEMENTATIONS.CV_STRATEGY // empty' "$CONTRACTS_ROOT/config/networks.json"
}

configured_cv_util_lib_address() {
  jq -r --arg n "$1" '.networks[] | select(.name == $n) | .IMPLEMENTATIONS.CV_UTIL_LIB // empty' "$CONTRACTS_ROOT/config/networks.json"
}

verify_cv_util_lib() {
  local network="$1"
  local rpc_url="$2"
  local strategy_impl
  local cv_util_lib
  local lib_code
  local strategy_code
  local normalized_lib

  strategy_impl="$(configured_cv_strategy_address "$network")"
  cv_util_lib="$(configured_cv_util_lib_address "$network")"

  if [[ -z "$strategy_impl" || "$strategy_impl" == "null" ]]; then
    echo "   missing IMPLEMENTATIONS.CV_STRATEGY"
    return 1
  fi

  if [[ -z "$cv_util_lib" || "$cv_util_lib" == "null" ]]; then
    echo "   missing IMPLEMENTATIONS.CV_UTIL_LIB"
    return 1
  fi

  if [[ "$cv_util_lib" == "0x0000000000000000000000000000000000000000" ]]; then
    echo "   IMPLEMENTATIONS.CV_UTIL_LIB is zero"
    return 1
  fi

  lib_code="$(cast code --rpc-url "$rpc_url" "$cv_util_lib")"
  if [[ -z "$lib_code" || "$lib_code" == "0x" ]]; then
    echo "   IMPLEMENTATIONS.CV_UTIL_LIB has no bytecode: $cv_util_lib"
    return 1
  fi

  strategy_code="$(cast code --rpc-url "$rpc_url" "$strategy_impl")"
  if [[ -z "$strategy_code" || "$strategy_code" == "0x" ]]; then
    echo "   IMPLEMENTATIONS.CV_STRATEGY has no bytecode: $strategy_impl"
    return 1
  fi

  normalized_lib="$(echo "${cv_util_lib#0x}" | tr '[:upper:]' '[:lower:]')"
  if ! grep -qi "$normalized_lib" <<< "$strategy_code"; then
    echo "   IMPLEMENTATIONS.CV_STRATEGY does not link IMPLEMENTATIONS.CV_UTIL_LIB"
    echo "   strategy: $strategy_impl"
    echo "   cv util:  $cv_util_lib"
    return 1
  fi

  echo "   CV_UTIL_LIB linked and deployed: $cv_util_lib"
}

verify_cv_util_lib_source() {
  local network="$1"
  local rpc_url="$2"
  local network_chain_id="$3"
  local cv_util_lib
  local cmd

  cv_util_lib="$(configured_cv_util_lib_address "$network")"
  if [[ -z "$cv_util_lib" || "$cv_util_lib" == "null" ]]; then
    echo "   missing IMPLEMENTATIONS.CV_UTIL_LIB"
    return 1
  fi

  cmd=(forge verify-contract
    --root "$CONTRACTS_ROOT/../.."
    --rpc-url "$rpc_url"
    --chain "$network_chain_id"
    --verifier etherscan
    --etherscan-api-key "$ETHERSCAN_API_KEY"
    --watch
    "$cv_util_lib"
    "pkg/contracts/src/CVStrategy/ConvictionsUtils.sol:ConvictionsUtils")

  if [[ "$network" == "opsepolia" ]]; then
    cmd+=(--verifier-url "https://api.etherscan.io/v2/api?chainid=11155420")
  fi

  "${cmd[@]}"
}

resolve_deployer_address() {
  local network="$1"

  if [[ -n "${DEPLOYER_ADDRESS:-}" ]]; then
    echo "$DEPLOYER_ADDRESS"
    return 0
  fi

  if [[ -n "${DEPLOYER_PRIVATE_KEY:-}" ]]; then
    cast wallet address --private-key "$DEPLOYER_PRIVATE_KEY"
    return 0
  fi

  if [[ -n "${PK_DEPLOYER_PW:-}" ]]; then
    cast wallet address --account PK_DEPLOYER --password "$PK_DEPLOYER_PW"
    return 0
  fi

  configured_sender_address "$network"
}

proxy_owner_upgrade_access() {
  local network="$1"
  local rpc_url="$2"
  local proxy_owner

  proxy_owner="$(proxy_owner_address "$network")"
  if [[ -z "$proxy_owner" || "$proxy_owner" == "null" ]]; then
    return 1
  fi

  cast call --rpc-url "$rpc_url" "$proxy_owner" "upgradeAccess()(address)" 2>/dev/null || return 1
}

chain_id() {
  jq -r --arg n "$1" '.networks[] | select(.name == $n) | .chainId // empty' "$CONTRACTS_ROOT/config/networks.json"
}

needs_legacy() {
  case "$1" in
    optimism|polygon|gnosis|base|celo) return 0 ;;
    *) return 1 ;;
  esac
}

run_upgrade_scope() {
  local scope="$1"
  local sig
  local failed=0

  case "$scope" in
    factory) sig='runFactory(string)' ;;
    communities) sig='runCommunities(string)' ;;
    strategies) sig='runStrategies(string)' ;;
    *)
      echo "Unsupported upgrade verification scope: $scope" >&2
      return 1
      ;;
  esac

  echo "==> Running ${scope} verifier (skipping pre/postflight)"

  : "${ETHERSCAN_API_KEY:?missing ETHERSCAN_API_KEY}"

  for network in "${NETWORKS[@]}"; do
    local rpc_url
    local network_chain_id
    local cmd
    local deployer_address

    rpc_url="$(rpc_url_for_network "$network")" || {
      echo "❌ $network $scope"
      failed=1
      continue
    }
    network_chain_id="$(chain_id "$network")"

    if [[ -z "$rpc_url" || -z "$network_chain_id" ]]; then
      echo "❌ $network $scope"
      failed=1
      continue
    fi

    deployer_address="$(resolve_deployer_address "$network")"
    if [[ -z "$deployer_address" || "$deployer_address" == "null" ]]; then
      echo "❌ $network $scope"
      echo "   missing deployer address (set DEPLOYER_ADDRESS, DEPLOYER_PRIVATE_KEY, PK_DEPLOYER_PW, or ENVS.SENDER)"
      failed=1
      continue
    fi

    if [[ "$scope" == "strategies" ]]; then
      if ! run_with_rpc_retry "$network CV_UTIL_LIB" verify_cv_util_lib "$network" "$rpc_url"; then
        local alternate_rpc_url=""
        alternate_rpc_url="$(alternate_rpc_url_for_network "$network")" || true
        if [[ -n "$alternate_rpc_url" ]]; then
          if run_with_rpc_retry "$network CV_UTIL_LIB (alternate RPC)" verify_cv_util_lib "$network" "$alternate_rpc_url"; then
            rpc_url="$alternate_rpc_url"
          else
            echo "❌ $network CV_UTIL_LIB"
            failed=1
            continue
          fi
        else
          echo "❌ $network CV_UTIL_LIB"
          failed=1
          continue
        fi
      fi

      if ! run_with_rpc_retry "$network CV_UTIL_LIB source" verify_cv_util_lib_source "$network" "$rpc_url" "$network_chain_id"; then
        echo "❌ $network CV_UTIL_LIB source"
        failed=1
        continue
      fi
    fi

    local current_upgrade_access=""
    if current_upgrade_access="$(proxy_owner_upgrade_access "$network" "$rpc_url")"; then
      if [[ "$current_upgrade_access" == "0x0000000000000000000000000000000000000000" ]]; then
        echo "### $network"
        echo "ℹ️  $network $scope skipped: ProxyOwner upgradeAccess already renounced"
        continue
      fi
    fi

    echo "### $network"
    cmd=(forge script script/UpgradeCVMultichain.s.sol:UpgradeCVMultichainScript
      --rpc-url "$rpc_url"
      --sig "$sig" "$network"
      --verifier etherscan
      --etherscan-api-key "$ETHERSCAN_API_KEY"
      --ffi
      --chain-id "$network_chain_id")

    if [[ -n "${PK_DEPLOYER_PW:-}" ]]; then
      cmd+=(--account PK_DEPLOYER --password "$PK_DEPLOYER_PW")
    fi

    if [[ "$network" == "opsepolia" ]]; then
      cmd+=(--verifier-url "https://api.etherscan.io/v2/api?chainid=11155420")
    fi

    if needs_legacy "$network"; then
      cmd+=(--legacy)
    fi

    if [[ "$VERIFY_REPLAY_OFFLINE" == "true" ]]; then
      cmd+=(--offline)
    fi

    if run_with_rpc_retry "$network $scope" env ETH_PASSWORD= DEPLOYER_ADDRESS="$deployer_address" REUSE_CONFIGURED_IMPLEMENTATIONS=true SKIP_PREFLIGHT=true SKIP_NETWORK_WRITES=true "${cmd[@]}"; then
      echo "✅ $network $scope"
      cooldown_after_network
    else
      local alternate_rpc_url=""
      alternate_rpc_url="$(alternate_rpc_url_for_network "$network")" || true
      if [[ -n "$alternate_rpc_url" ]]; then
        cmd=(forge script script/UpgradeCVMultichain.s.sol:UpgradeCVMultichainScript
          --rpc-url "$alternate_rpc_url"
          --sig "$sig" "$network"
          --verifier etherscan
          --etherscan-api-key "$ETHERSCAN_API_KEY"
          --ffi
          --chain-id "$network_chain_id")

        if [[ -n "${PK_DEPLOYER_PW:-}" ]]; then
          cmd+=(--account PK_DEPLOYER --password "$PK_DEPLOYER_PW")
        fi

        if [[ "$network" == "opsepolia" ]]; then
          cmd+=(--verifier-url "https://api.etherscan.io/v2/api?chainid=11155420")
        fi

        if needs_legacy "$network"; then
          cmd+=(--legacy)
        fi

        if [[ "$VERIFY_REPLAY_OFFLINE" == "true" ]]; then
          cmd+=(--offline)
        fi

        if run_with_rpc_retry "$network $scope (alternate RPC)" env ETH_PASSWORD= DEPLOYER_ADDRESS="$deployer_address" REUSE_CONFIGURED_IMPLEMENTATIONS=true SKIP_PREFLIGHT=true SKIP_NETWORK_WRITES=true "${cmd[@]}"; then
          echo "✅ $network $scope"
          cooldown_after_network
          continue
        fi
      fi

      echo "❌ $network $scope"
      failed=1
    fi
  done

  return "$failed"
}

failed=0

if [[ -n "${REQUESTED_SCOPES[global]:-}" ]]; then
  if ! run_global_scope both; then
    failed=1
  fi
fi

if [[ -n "${REQUESTED_SCOPES[state]:-}" ]]; then
  if ! run_state_scope; then
    failed=1
  fi
fi

if [[ -n "${REQUESTED_SCOPES[pause]:-}" ]]; then
  if ! run_global_scope pause; then
    failed=1
  fi
fi

if [[ -n "${REQUESTED_SCOPES[escrow]:-}" ]]; then
  if ! run_global_scope escrow; then
    failed=1
  fi
fi

if [[ -n "${REQUESTED_SCOPES[factory]:-}" ]]; then
  if ! run_upgrade_scope factory; then
    failed=1
  fi
fi

if [[ -n "${REQUESTED_SCOPES[communities]:-}" ]]; then
  if ! run_upgrade_scope communities; then
    failed=1
  fi
fi

if [[ -n "${REQUESTED_SCOPES[strategies]:-}" ]]; then
  if ! run_upgrade_scope strategies; then
    failed=1
  fi
fi

if [[ -n "${REQUESTED_SCOPES[facets]:-}" ]]; then
  if ! run_diamond_scope; then
    failed=1
  fi
fi

if [[ "$failed" -ne 0 ]]; then
  echo "One or more scoped verifications failed."
  exit 1
fi

echo "All requested scoped verifications succeeded."
