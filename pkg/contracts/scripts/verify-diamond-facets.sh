#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage: scripts/verify-diamond-facets.sh --network <name> [--rpc-url <url>] [--chain-id <id>] [--etherscan-key <key>] [--out-dir <path>] [--proxy <address>...]

Options:
  --network         Network name from config/networks.json (infers chain-id and proxies)
  --rpc-url         RPC URL for the target chain (or set RPC_URL)
  --chain-id        Chain ID for verification (or set CHAIN_ID)
  --etherscan-key   Etherscan/Arbiscan API key (or set ETHERSCAN_API_KEY)
  --out-dir         Foundry out directory to scan for artifacts
  --proxy           Diamond proxy address to inspect (can be repeated)

Examples:
  scripts/verify-diamond-facets.sh --rpc-url "$RPC_URL_ARB_TESTNET" --chain-id 421614 --network arbsepolia
  scripts/verify-diamond-facets.sh --rpc-url "$RPC_URL" --chain-id 421614 --proxy 0xProxy...
USAGE
}

RPC_URL=${RPC_URL:-}
CHAIN_ID=${CHAIN_ID:-}
ETHERSCAN_API_KEY=${ETHERSCAN_API_KEY:-}
NETWORK=""
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

if [[ -n "$NETWORK" && -z "$CHAIN_ID" ]]; then
  CHAIN_ID=$(jq -r ".networks[] | select(.name==\"$NETWORK\") | .chainId" \
    "$CONTRACTS_DIR/config/networks.json")
  if [[ -z "$CHAIN_ID" || "$CHAIN_ID" == "null" ]]; then
    echo "Unable to infer chain-id for network: $NETWORK" >&2
    exit 1
  fi
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

if [[ -z "$RPC_URL" && -n "$CHAIN_ID" ]]; then
  load_rpc_from_env
fi

if [[ -z "$ETHERSCAN_API_KEY" ]]; then
  env_file="$ROOT_DIR/pkg/contracts/.env"
  if [[ -f "$env_file" ]]; then
    ETHERSCAN_API_KEY=$(grep -E '^ETHERSCAN_API_KEY=' "$env_file" | head -n 1 | cut -d= -f2-)
  fi
fi

if [[ -z "$RPC_URL" || -z "$CHAIN_ID" ]]; then
  echo "Missing --rpc-url or --chain-id (can be inferred from --network)." >&2
  usage
  exit 1
fi

if [[ -z "$ETHERSCAN_API_KEY" ]]; then
  echo "Missing --etherscan-key (or ETHERSCAN_API_KEY env)." >&2
  usage
  exit 1
fi

if [[ -n "$NETWORK" ]]; then
  mapfile -t NETWORK_PROXIES < <(
    jq -r ".networks[] | select(.name==\"$NETWORK\") | (.PROXIES.REGISTRY_COMMUNITIES[]?, .PROXIES.CV_STRATEGIES[]?)" \
      "$CONTRACTS_DIR/config/networks.json"
  )
  PROXIES+=("${NETWORK_PROXIES[@]}")
fi

if [[ ${#PROXIES[@]} -eq 0 ]]; then
  echo "No proxies provided. Use --network or --proxy." >&2
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

build_contract_map

get_facet_addresses() {
  local proxy="$1"
  local raw
  raw=$(cast call --rpc-url "$RPC_URL" "$proxy" "facetAddresses()(address[])")
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

declare -A SEEN

echo "Using RPC: $RPC_URL"
echo "Using chain-id: $CHAIN_ID"
echo "Inspecting ${#PROXIES[@]} proxy(s)"

for proxy in "${PROXIES[@]}"; do
  echo "Inspecting proxy: $proxy"
  while read -r facet; do
    [[ -z "$facet" ]] && continue
    if [[ -n "${SEEN[$facet]:-}" ]]; then
      continue
    fi
    SEEN["$facet"]=1

    codehash=$(cast codehash --rpc-url "$RPC_URL" "$facet")
    contract=${HASH_TO_CONTRACT[$codehash]:-}
    if [[ -z "$contract" ]]; then
      echo "  Unknown facet codehash for $facet (skipping)"
      continue
    fi

    echo "  Verifying $facet as $contract"
    forge verify-contract \
      --chain-id "$CHAIN_ID" \
      --etherscan-api-key "$ETHERSCAN_API_KEY" \
      "$facet" \
      "$contract"
  done < <(get_facet_addresses "$proxy" | sort -u)
done

echo "Done. Verified ${#SEEN[@]} unique facet address(es)."
