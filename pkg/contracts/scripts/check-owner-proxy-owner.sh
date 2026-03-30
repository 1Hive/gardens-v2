#!/usr/bin/env bash
set -euo pipefail

CONTRACTS_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONFIG_PATH="$CONTRACTS_ROOT/config/networks.json"
ENV_PATH="$CONTRACTS_ROOT/.env"

NETWORKS=()
EXPECTED_OWNER_OVERRIDE=""
EXPECTED_PROXY_OWNER_OVERRIDE=""
ONLY_MAINNETS="false"
ONLY_TESTNETS="false"
OWNER_WHEN_UPGRADE_ACCESS_ZERO="0x9a17De1f0caD0c592F656410997E4B685d339029"
ZERO_ADDRESS="0x0000000000000000000000000000000000000000"

usage() {
  cat <<'USAGE'
Usage: scripts/check-owner-proxy-owner.sh [options]

Checks owner() and proxyOwner() for each configured target contract:
  - ENVS.ARBITRATOR
  - ENVS.PASSPORT_SCORER
  - ENVS.GOOD_DOLLAR_SYBIL
  - ENVS.STREAMING_ESCROW_FACTORY
  - PROXIES.REGISTRY_FACTORY
  - PROXIES.REGISTRY_COMMUNITIES[*]
  - PROXIES.CV_STRATEGIES[*]

Options:
  --network <name>                 Check one network (repeatable)
  --mainnets                       Check only mainnets from networks.json
  --testnets                       Check only testnets from networks.json
  --expected-owner <address>       Force same expected owner() for all checked networks
  --expected-proxy-owner <address> Force same expected proxyOwner() for all checked networks
  -h, --help                       Show this help

Defaults:
  - Networks: all in networks.json
  - expected owner(): ENVS.SENDER per network
  - expected proxyOwner(): ENVS.PROXY_OWNER per network
USAGE
}

rpc_env_name() {
  case "$1" in
    ethsepolia) echo "RPC_URL_SEP_TESTNET" ;;
    arbsepolia) echo "RPC_URL_ARB_TESTNET" ;;
    opsepolia) echo "RPC_URL_OP_TESTNET" ;;
    sepolia) echo "RPC_URL_SEP_TESTNET" ;;
    ethereum|mainnet) echo "RPC_URL_ETHEREUM" ;;
    arbitrum) echo "RPC_URL_ARB" ;;
    optimism) echo "RPC_URL_OPT" ;;
    polygon) echo "RPC_URL_POLYGON" ;;
    gnosis) echo "RPC_URL_GNOSIS" ;;
    base) echo "RPC_URL_BASE" ;;
    celo) echo "RPC_URL_CELO" ;;
    *) return 1 ;;
  esac
}

normalize_addr() {
  tr '[:upper:]' '[:lower:]' <<< "$1"
}

# Load local env defaults for RPC URLs when running outside a preconfigured shell.
if [[ -f "$ENV_PATH" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_PATH"
  set +a
fi

while [[ $# -gt 0 ]]; do
  case "$1" in
    --network)
      NETWORKS+=("$2")
      shift 2
      ;;
    --mainnets)
      ONLY_MAINNETS="true"
      shift
      ;;
    --testnets)
      ONLY_TESTNETS="true"
      shift
      ;;
    --expected-owner)
      EXPECTED_OWNER_OVERRIDE="$2"
      shift 2
      ;;
    --expected-proxy-owner)
      EXPECTED_PROXY_OWNER_OVERRIDE="$2"
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

if [[ "$ONLY_MAINNETS" == "true" && "$ONLY_TESTNETS" == "true" ]]; then
  echo "--mainnets and --testnets are mutually exclusive" >&2
  exit 1
fi

if [[ ! -f "$CONFIG_PATH" ]]; then
  echo "Missing config file: $CONFIG_PATH" >&2
  exit 1
fi

if [[ ${#NETWORKS[@]} -eq 0 ]]; then
  if [[ "$ONLY_MAINNETS" == "true" ]]; then
    mapfile -t NETWORKS < <(jq -r '.networks[] | select(.testnet == false) | .name' "$CONFIG_PATH")
  elif [[ "$ONLY_TESTNETS" == "true" ]]; then
    mapfile -t NETWORKS < <(jq -r '.networks[] | select(.testnet == true) | .name' "$CONFIG_PATH")
  else
    mapfile -t NETWORKS < <(jq -r '.networks[].name' "$CONFIG_PATH")
  fi
fi

if [[ ${#NETWORKS[@]} -eq 0 ]]; then
  echo "No networks selected." >&2
  exit 1
fi

overall_failures=0
overall_checked=0

echo "Checking owner()/proxyOwner() across ${#NETWORKS[@]} network(s)..."

for network in "${NETWORKS[@]}"; do
  rpc_var="$(rpc_env_name "$network" 2>/dev/null || true)"
  if [[ -z "$rpc_var" ]]; then
    echo "[ERROR] $network: unsupported network name for RPC mapping"
    overall_failures=$((overall_failures + 1))
    continue
  fi

  rpc_url="${!rpc_var:-}"
  if [[ -z "$rpc_url" ]]; then
    echo "[ERROR] $network: missing required env var $rpc_var"
    overall_failures=$((overall_failures + 1))
    continue
  fi

  expected_owner="$EXPECTED_OWNER_OVERRIDE"
  if [[ -z "$expected_owner" ]]; then
    expected_owner="$(jq -r --arg n "$network" '.networks[] | select(.name == $n) | .ENVS.SENDER // empty' "$CONFIG_PATH")"
  fi

  expected_proxy_owner="$EXPECTED_PROXY_OWNER_OVERRIDE"
  if [[ -z "$expected_proxy_owner" ]]; then
    expected_proxy_owner="$(jq -r --arg n "$network" '.networks[] | select(.name == $n) | .ENVS.PROXY_OWNER // empty' "$CONFIG_PATH")"
  fi

  if [[ -z "$expected_owner" || -z "$expected_proxy_owner" ]]; then
    echo "[ERROR] $network: missing expected owner/proxy owner values"
    overall_failures=$((overall_failures + 1))
    continue
  fi

  expected_owner_lc="$(normalize_addr "$expected_owner")"
  expected_proxy_owner_lc="$(normalize_addr "$expected_proxy_owner")"

  mapfile -t targets < <(
    jq -r --arg n "$network" '
      .networks[]
      | select(.name == $n) as $net
      | [
          ["ENVS.ARBITRATOR", $net.ENVS.ARBITRATOR],
          ["ENVS.PASSPORT_SCORER", $net.ENVS.PASSPORT_SCORER],
          ["ENVS.GOOD_DOLLAR_SYBIL", $net.ENVS.GOOD_DOLLAR_SYBIL],
          ["ENVS.STREAMING_ESCROW_FACTORY", $net.ENVS.STREAMING_ESCROW_FACTORY],
          ["PROXIES.REGISTRY_FACTORY", $net.PROXIES.REGISTRY_FACTORY]
        ]
        + ((($net.PROXIES.REGISTRY_COMMUNITIES // []) | to_entries | map(["PROXIES.REGISTRY_COMMUNITIES[\(.key)]", .value])) // [])
        + ((($net.PROXIES.CV_STRATEGIES // []) | to_entries | map(["PROXIES.CV_STRATEGIES[\(.key)]", .value])) // [])
      | .[]
      | select(.[1] != null and .[1] != "")
      | @tsv
    ' "$CONFIG_PATH"
  )

  if [[ ${#targets[@]} -eq 0 ]]; then
    echo "[WARN] $network: no target contracts found"
    continue
  fi

  network_failures=0
  network_checked=0

  echo ""
  echo "### $network"
  echo "expected owner():      $expected_owner"
  echo "expected proxyOwner(): $expected_proxy_owner"

  for target in "${targets[@]}"; do
    label="${target%%$'\t'*}"
    address="${target#*$'\t'}"

    owner_raw=""
    proxy_owner_raw=""

    if owner_raw="$(cast call "$address" "owner()(address)" --rpc-url "$rpc_url" 2>&1)"; then
      owner_lc="$(normalize_addr "$owner_raw")"
    else
      owner_lc=""
    fi

    if proxy_owner_raw="$(cast call "$address" "proxyOwner()(address)" --rpc-url "$rpc_url" 2>&1)"; then
      proxy_owner_lc="$(normalize_addr "$proxy_owner_raw")"
    else
      proxy_owner_lc=""
    fi

    owner_ok="false"
    proxy_owner_ok="false"
    target_expected_owner_lc="$expected_owner_lc"

    # ProxyOwner contracts can intentionally resolve owner() to proxyOwner() when
    # upgradeAccess is zero. In that state owner() is expected to match
    # OWNER_WHEN_UPGRADE_ACCESS_ZERO for this operational check.
    upgrade_access_raw=""
    upgrade_access_lc=""
    if upgrade_access_raw="$(cast call "$address" "upgradeAccess()(address)" --rpc-url "$rpc_url" 2>/dev/null)"; then
      upgrade_access_lc="$(normalize_addr "$upgrade_access_raw")"
      if [[ "$upgrade_access_lc" == "$ZERO_ADDRESS" ]]; then
        target_expected_owner_lc="$(normalize_addr "$OWNER_WHEN_UPGRADE_ACCESS_ZERO")"
      fi
    fi

    [[ -n "$owner_lc" && "$owner_lc" == "$target_expected_owner_lc" ]] && owner_ok="true"
    [[ -n "$proxy_owner_lc" && "$proxy_owner_lc" == "$expected_proxy_owner_lc" ]] && proxy_owner_ok="true"

    if [[ "$owner_ok" == "true" && "$proxy_owner_ok" == "true" ]]; then
      echo "[OK] $label $address"
    else
      echo "[FAIL] $label $address"
      if [[ "$owner_ok" == "true" ]]; then
        echo "  owner():      $owner_raw"
      else
        echo "  owner():      ${owner_raw:-<missing>}"
        if [[ "$target_expected_owner_lc" != "$expected_owner_lc" ]]; then
          echo "  expected owner() adjusted due to zero upgradeAccess: $OWNER_WHEN_UPGRADE_ACCESS_ZERO"
        fi
      fi
      if [[ "$proxy_owner_ok" == "true" ]]; then
        echo "  proxyOwner(): $proxy_owner_raw"
      else
        echo "  proxyOwner(): ${proxy_owner_raw:-<missing>}"
      fi
      network_failures=$((network_failures + 1))
      overall_failures=$((overall_failures + 1))
    fi

    network_checked=$((network_checked + 1))
    overall_checked=$((overall_checked + 1))
  done

  echo "summary: $network_checked checked, $network_failures failed"
done

echo ""
echo "Overall: $overall_checked checked, $overall_failures failed"

if [[ "$overall_failures" -ne 0 ]]; then
  exit 1
fi

echo "All owner()/proxyOwner() checks passed."
