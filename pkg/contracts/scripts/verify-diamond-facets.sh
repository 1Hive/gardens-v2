#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage: scripts/verify-diamond-facets.sh --network <name> [--rpc-url <url>] [--chain-id <id>] [--etherscan-key <key>] [--out-dir <path>] [--proxy <address>...]
       scripts/verify-diamond-facets.sh --all-prod [--etherscan-key <key>] [--out-dir <path>]

Options:
  --network         Network name from config/networks.json (infers chain-id and proxies)
  --all-prod        Verify all production networks (non-testnet entries in config/networks.json)
  --rpc-url         RPC URL for the target chain (or set RPC_URL)
  --chain-id        Chain ID for verification (or set CHAIN_ID)
  --etherscan-key   Etherscan/Arbiscan API key (or set ETHERSCAN_API_KEY)
  --out-dir         Foundry out directory to scan for artifacts
  --proxy           Diamond proxy address to inspect (can be repeated)

Examples:
  scripts/verify-diamond-facets.sh --rpc-url "$RPC_URL_ARB_TESTNET" --chain-id 421614 --network arbsepolia
  scripts/verify-diamond-facets.sh --rpc-url "$RPC_URL" --chain-id 421614 --proxy 0xProxy...
  scripts/verify-diamond-facets.sh --all-prod
USAGE
}

RPC_URL=${RPC_URL:-}
CHAIN_ID=${CHAIN_ID:-}
ETHERSCAN_API_KEY=${ETHERSCAN_API_KEY:-}
NETWORK=""
ALL_PROD=false
PROXIES=()
OUT_DIR=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --rpc-url)
      RPC_URL="$2"
      shift 2
      ;;
    --chain-id)
      CHAIN_ID="$2"
      shift 2
      ;;
    --etherscan-key)
      ETHERSCAN_API_KEY="$2"
      shift 2
      ;;
    --out-dir)
      OUT_DIR="$2"
      shift 2
      ;;
    --network)
      NETWORK="$2"
      shift 2
      ;;
    --all-prod)
      ALL_PROD=true
      shift 1
      ;;
    --proxy)
      PROXIES+=("$2")
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

ROOT_DIR=$(git rev-parse --show-toplevel)
CONTRACTS_DIR="$ROOT_DIR/pkg/contracts"
if [[ -z "$OUT_DIR" ]]; then
  OUT_DIR="$CONTRACTS_DIR/out"
fi

load_rpc_from_env() {
  local env_file="$ROOT_DIR/pkg/contracts/.env"
  if [[ ! -f "$env_file" ]]; then
    return
  fi
  local rpc_var=""
  case "$CHAIN_ID" in
    421614) rpc_var="RPC_URL_ARB_TESTNET";;
    11155111) rpc_var="RPC_URL_SEP_TESTNET";;
    11155420) rpc_var="RPC_URL_OP_TESTNET";;
    42161) rpc_var="RPC_URL_ARB";;
    10) rpc_var="RPC_URL_OPT";;
    1) rpc_var="RPC_URL_MAINNET";;
    137) rpc_var="RPC_URL_POLYGON";;
    100) rpc_var="RPC_URL_GNOSIS";;
    8453) rpc_var="RPC_URL_BASE";;
    42220) rpc_var="RPC_URL_CELO";;
  esac

  if [[ -n "$rpc_var" ]]; then
    RPC_URL=$(grep -E "^${rpc_var}=" "$env_file" | head -n 1 | cut -d= -f2-)
  fi
}

if [[ -z "$ETHERSCAN_API_KEY" ]]; then
  env_file="$ROOT_DIR/pkg/contracts/.env"
  if [[ -f "$env_file" ]]; then
    ETHERSCAN_API_KEY=$(grep -E '^ETHERSCAN_API_KEY=' "$env_file" | head -n 1 | cut -d= -f2-)
  fi
fi

if [[ -z "$ETHERSCAN_API_KEY" ]]; then
  echo "Missing --etherscan-key (or ETHERSCAN_API_KEY env)." >&2
  usage
  exit 1
fi

declare -A HASH_TO_CONTRACT

build_contract_map() {
  echo "Scanning facet artifacts in $OUT_DIR ..."
  while IFS= read -r -d '' artifact; do
    source=$(jq -r '.metadata.settings.compilationTarget // {} | keys[0] // empty' "$artifact")
    name=$(jq -r '.metadata.settings.compilationTarget // {} | .[] // empty' "$artifact")
    bytecode=$(jq -r '.deployedBytecode.object // empty' "$artifact")

    if [[ -z "$source" || -z "$name" || -z "$bytecode" || "$bytecode" == "0x" || "$bytecode" == "null" ]]; then
      continue
    fi

    if [[ ! "$bytecode" =~ ^0x[0-9a-fA-F]+$ ]]; then
      continue
    fi

    if [[ "$source" != *"/facets/"* && "$name" != *"Facet"* ]]; then
      continue
    fi

    hash=$(cast keccak "$bytecode")
    if [[ -z "${HASH_TO_CONTRACT[$hash]:-}" ]]; then
      HASH_TO_CONTRACT["$hash"]="$source:$name"
    fi
  done < <(find "$OUT_DIR" -type f -name "*.json" -print0)
  local hash_count
  hash_count=$(printf '%s\n' "${!HASH_TO_CONTRACT[@]}" | wc -l | tr -d ' ')
  echo "Loaded ${hash_count} facet bytecode hashes"
}

get_facet_addresses() {
  local proxy="$1"
  local raw
  raw=$(cast call --rpc-url "$RPC_URL" "$proxy" "facetAddresses()(address[])")
  echo "    - Decoding facet addresses for $proxy" >&2
  if [[ "$raw" == "{"* ]]; then
    echo "$raw" | jq -r '.decoded | if type=="array" then (.[0] // .) | .[] else empty end'
    return
  fi

  if decoded=$(cast abi-decode "f(address[])" "$raw" 2>/dev/null); then
    echo "$decoded" | tr -d '[](),' | tr ' ' '\n' | awk '/^0x[0-9a-fA-F]{40}$/ { print }'
    return
  fi

  echo "$raw" | grep -oE '0x[0-9a-fA-F]{40}' || true
}

load_chain_id() {
  local network="$1"
  local chain_id
  chain_id=$(jq -r ".networks[] | select(.name==\"$network\") | .chainId" \
    "$CONTRACTS_DIR/config/networks.json")
  if [[ -z "$chain_id" || "$chain_id" == "null" ]]; then
    echo "Unable to infer chain-id for network: $network" >&2
    return 1
  fi
  echo "$chain_id"
}

load_proxies_for_network() {
  local network="$1"
  jq -r ".networks[] | select(.name==\"$network\") | (.PROXIES.REGISTRY_COMMUNITIES[]?, .PROXIES.CV_STRATEGIES[]?)" \
    "$CONTRACTS_DIR/config/networks.json"
}

get_prod_networks() {
  jq -r '.networks[].name | select(test("sepolia|testnet") | not)' \
    "$CONTRACTS_DIR/config/networks.json"
}

verify_network() {
  local network="$1"
  local chain_id="$2"
  local rpc_url="$3"
  shift 3
  local proxies=("$@")
  local -A seen=()
  local display_name="${network:-custom}"

  echo "Network: $display_name"
  echo "  - Using RPC: $rpc_url"
  echo "  - Using chain-id: $chain_id"
  echo "  - Inspecting ${#proxies[@]} proxy(s)"

  for proxy in "${proxies[@]}"; do
    echo "  - Inspecting proxy: $proxy"
    while read -r facet; do
      [[ -z "$facet" ]] && continue
      if [[ -n "${seen[$facet]:-}" ]]; then
        continue
      fi
      seen["$facet"]=1

      echo "    - Fetching codehash for $facet"
      codehash=$(cast codehash --rpc-url "$rpc_url" "$facet")
      contract=${HASH_TO_CONTRACT[$codehash]:-}
      if [[ -z "$contract" ]]; then
        echo "    - Unknown facet codehash for $facet (skipping)"
        continue
      fi

      echo "    - Verifying $facet as $contract"
      forge verify-contract \
        --chain-id "$chain_id" \
        --etherscan-api-key "$ETHERSCAN_API_KEY" \
        "$facet" \
        "$contract"
    done < <(get_facet_addresses "$proxy" | sort -u)
  done

  local total
  total=$(printf '%s\n' "${!seen[@]}" | wc -l | tr -d ' ')
  echo "  - Done. Verified ${total} unique facet address(es)."
}

build_contract_map

if [[ "$ALL_PROD" == "true" ]]; then
  mapfile -t PROD_NETWORKS < <(get_prod_networks)
  if [[ ${#PROD_NETWORKS[@]} -eq 0 ]]; then
    echo "No production networks found in config/networks.json." >&2
    exit 1
  fi

  failures=()
  base_rpc_url="$RPC_URL"
  for network in "${PROD_NETWORKS[@]}"; do
    RPC_URL="$base_rpc_url"
    CHAIN_ID=$(load_chain_id "$network") || { failures+=("$network"); continue; }
    if [[ -z "$RPC_URL" ]]; then
      load_rpc_from_env
    fi
    if [[ -z "$RPC_URL" ]]; then
      echo "Missing RPC URL for network: $network" >&2
      failures+=("$network")
      continue
    fi
    mapfile -t PROXIES < <(load_proxies_for_network "$network")
    if [[ ${#PROXIES[@]} -eq 0 ]]; then
      echo "No proxies found for network: $network" >&2
      failures+=("$network")
      continue
    fi
    verify_network "$network" "$CHAIN_ID" "$RPC_URL" "${PROXIES[@]}" || failures+=("$network")
  done

  if [[ ${#failures[@]} -gt 0 ]]; then
    printf 'Failed networks: %s\n' "${failures[*]}" >&2
    exit 1
  fi
else
  if [[ -n "$NETWORK" && -z "$CHAIN_ID" ]]; then
    CHAIN_ID=$(load_chain_id "$NETWORK") || exit 1
  fi

  if [[ -z "$RPC_URL" && -n "$CHAIN_ID" ]]; then
    load_rpc_from_env
  fi

  if [[ -z "$RPC_URL" || -z "$CHAIN_ID" ]]; then
    echo "Missing --rpc-url or --chain-id (can be inferred from --network)." >&2
    usage
    exit 1
  fi

  if [[ -n "$NETWORK" ]]; then
    mapfile -t NETWORK_PROXIES < <(load_proxies_for_network "$NETWORK")
    PROXIES+=("${NETWORK_PROXIES[@]}")
  fi

  if [[ ${#PROXIES[@]} -eq 0 ]]; then
    echo "No proxies provided. Use --network or --proxy." >&2
    usage
    exit 1
  fi

  verify_network "$NETWORK" "$CHAIN_ID" "$RPC_URL" "${PROXIES[@]}"
fi
