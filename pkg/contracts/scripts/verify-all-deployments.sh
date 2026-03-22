#!/usr/bin/env bash
set -euo pipefail

CONTRACTS_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NETWORKS=()
SCOPE="all"

usage() {
  cat <<'USAGE'
Usage: scripts/verify-all-deployments.sh [--scope <scope>] [--network <name>]...

Scopes:
  all         Run global + state + factory + communities + strategies + facets
  global      Run pause + escrow verifiers
  state       Verify live contract state against config/networks.json
  pause       Run only global pause controller verifier
  escrow      Run only streaming escrow verifier
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
  NETWORKS=(arbitrum optimism polygon gnosis base celo)
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
  "${cmd[@]}"
}

run_state_scope() {
  local failed=0

  echo "==> Running config/state verifier"

  for network in "${NETWORKS[@]}"; do
    local rpc_var
    local rpc_url
    local network_chain_id
    local cmd

    rpc_var="$(rpc_env_name "$network")" || {
      echo "❌ $network state"
      failed=1
      continue
    }
    rpc_url="${!rpc_var:-}"
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
      --chain-id "$network_chain_id"
      -vv)

    if "${cmd[@]}"; then
      echo "✅ $network state"
    else
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
    echo "### $network"
    if bash "$CONTRACTS_ROOT/scripts/verify-diamond-facets.sh" --network "$network"; then
      echo "✅ $network facets"
    else
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
    mainnet) echo "RPC_URL_MAINNET" ;;
    polygon) echo "RPC_URL_POLYGON" ;;
    gnosis) echo "RPC_URL_GNOSIS" ;;
    base) echo "RPC_URL_BASE" ;;
    celo) echo "RPC_URL_CELO" ;;
    *) return 1 ;;
  esac
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

  for network in "${NETWORKS[@]}"; do
    local rpc_var
    local rpc_url
    local network_chain_id
    local cmd

    rpc_var="$(rpc_env_name "$network")" || {
      echo "❌ $network $scope"
      failed=1
      continue
    }
    rpc_url="${!rpc_var:-}"
    network_chain_id="$(chain_id "$network")"

    if [[ -z "$rpc_url" || -z "$network_chain_id" || -z "${PRIVATE_KEY:-}" ]]; then
      echo "❌ $network $scope"
      failed=1
      continue
    fi

    echo "### $network"
    cmd=(forge script script/UpgradeCVMultichain.s.sol:UpgradeCVMultichain
      --rpc-url "$rpc_url"
      --sig "$sig" "$network"
      --private-key "$PRIVATE_KEY"
      --ffi
      --chain-id "$network_chain_id"
      -vv)

    if needs_legacy "$network"; then
      cmd+=(--legacy)
    fi

    if SKIP_PREFLIGHT=true "${cmd[@]}"; then
      echo "✅ $network $scope"
    else
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
