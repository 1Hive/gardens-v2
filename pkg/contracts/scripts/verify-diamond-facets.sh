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
VERIFIER_URL=""
VERIFY_RPC_MAX_ATTEMPTS=${VERIFY_RPC_MAX_ATTEMPTS:-4}
VERIFY_RPC_INITIAL_DELAY=${VERIFY_RPC_INITIAL_DELAY:-8}
VERIFY_RPC_SUCCESS_DELAY=${VERIFY_RPC_SUCCESS_DELAY:-2}
STRICT_FACET_MATCH=${STRICT_FACET_MATCH:-true}

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
    --verifier-url)
      VERIFIER_URL="$2"
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
    1) rpc_var="RPC_URL_ETHEREUM";;
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
declare -A LINKED_HASH_TO_CONTRACT
declare -A CONTRACT_TO_LINK_SPECS

normalize_bytecode() {
  local bytecode="$1"
  local specs="$2"
  local normalized="${bytecode#0x}"
  local spec

  if [[ -z "$specs" ]]; then
    printf '0x%s\n' "$normalized"
    return 0
  fi

  IFS=',' read -r -a spec_items <<< "$specs"
  for spec in "${spec_items[@]}"; do
    [[ -z "$spec" ]] && continue

    IFS=':' read -r start length _lib_source _lib_name <<< "$spec"
    local char_start=$((start * 2))
    local char_length=$((length * 2))
    local zero_fill
    zero_fill=$(printf '%0*s' "$char_length" '' | tr ' ' '0')
    normalized="${normalized:0:char_start}${zero_fill}${normalized:char_start + char_length}"
  done

  printf '0x%s\n' "$normalized"
}

extract_libraries_from_bytecode() {
  local bytecode="$1"
  local specs="$2"
  local stripped="${bytecode#0x}"
  local libraries=()
  local spec

  [[ -z "$specs" ]] && return 0

  IFS=',' read -r -a spec_items <<< "$specs"
  for spec in "${spec_items[@]}"; do
    [[ -z "$spec" ]] && continue

    IFS=':' read -r start length lib_source lib_name <<< "$spec"
    local char_start=$((start * 2))
    local char_length=$((length * 2))
    local address="0x${stripped:char_start:char_length}"
    libraries+=("${lib_source}:${lib_name}:${address}")
  done

  IFS=','
  printf '%s\n' "${libraries[*]}"
  unset IFS
}

resolve_contract_for_bytecode() {
  local facet="$1"
  local rpc_url="$2"
  local codehash="$3"
  local linked_hash
  local bytecode

  RESOLVED_CONTRACT="${HASH_TO_CONTRACT[$codehash]:-}"
  RESOLVED_LIBRARIES=""
  if [[ -n "$RESOLVED_CONTRACT" ]]; then
    return 0
  fi

  if ! bytecode=$(verify_with_retry "bytecode for $facet" cast code --rpc-url "$rpc_url" "$facet"); then
    return 1
  fi

  for linked_hash in "${!LINKED_HASH_TO_CONTRACT[@]}"; do
    local contract="${LINKED_HASH_TO_CONTRACT[$linked_hash]}"
    local specs="${CONTRACT_TO_LINK_SPECS[$contract]:-}"
    local normalized

    normalized=$(normalize_bytecode "$bytecode" "$specs")
    if [[ "$(cast keccak "$normalized")" != "$linked_hash" ]]; then
      continue
    fi

    RESOLVED_CONTRACT="$contract"
    RESOLVED_LIBRARIES=$(extract_libraries_from_bytecode "$bytecode" "$specs")
    return 0
  done

  return 1
}

verify_resolved_contract() {
  local facet="$1"
  local chain_id="$2"
  local description="$3"
  shift 3
  local verifier_args=("$@")
  local -a library_args=()
  local verify_cmd=(
    forge verify-contract
    --chain-id "$chain_id"
    "${verifier_args[@]}"
    --etherscan-api-key "$ETHERSCAN_API_KEY"
  )

  if [[ -n "$RESOLVED_LIBRARIES" ]]; then
    local library_spec
    IFS=',' read -r -a resolved_library_items <<< "$RESOLVED_LIBRARIES"
    for library_spec in "${resolved_library_items[@]}"; do
      [[ -z "$library_spec" ]] && continue
      library_args+=(--libraries "$library_spec")
    done
    verify_cmd+=("${library_args[@]}")
  fi

  verify_cmd+=("$facet" "$RESOLVED_CONTRACT")
  verify_with_retry "$description" "${verify_cmd[@]}"
}

is_retryable_rpc_error() {
  grep -Eqi 'rate limit|max calls per sec|expected value|SourcifyResponse|429|timeout|failed to get storage|HTTP error 429|Max retries exceeded' <<< "$1"
}

verify_with_retry() {
  local description="$1"
  shift

  local attempt=1
  local max_attempts="$VERIFY_RPC_MAX_ATTEMPTS"
  local delay="$VERIFY_RPC_INITIAL_DELAY"
  local output

  while true; do
    if output="$("$@" 2>&1)"; then
      printf '%s\n' "$output"
      sleep "$VERIFY_RPC_SUCCESS_DELAY"
      return 0
    fi

    printf '%s\n' "$output" >&2
    if [[ "$attempt" -ge "$max_attempts" ]]; then
      return 1
    fi

    if is_retryable_rpc_error "$output"; then
      echo "    - Retrying $description after ${delay}s (attempt $((attempt + 1))/${max_attempts})..." >&2
      sleep "$delay"
      attempt=$((attempt + 1))
      delay=$((delay * 2))
      continue
    fi

    return 1
  done
}

build_contract_map() {
  echo "Scanning facet artifacts in $OUT_DIR ..."
  while IFS= read -r -d '' artifact; do
    source=$(jq -r '.metadata.settings.compilationTarget // {} | keys[0] // empty' "$artifact")
    name=$(jq -r '.metadata.settings.compilationTarget // {} | .[] // empty' "$artifact")
    bytecode=$(jq -r '.deployedBytecode.object // empty' "$artifact")
    link_specs=$(jq -r '[
      .deployedBytecode.linkReferences // {}
      | to_entries[]?
      | .key as $lib_source
      | .value
      | to_entries[]?
      | .key as $lib_name
      | .value[]?
      | "\(.start):\(.length):\($lib_source):\($lib_name)"
    ] | join(",")' "$artifact")

    if [[ -z "$source" || -z "$name" || -z "$bytecode" || "$bytecode" == "0x" || "$bytecode" == "null" ]]; then
      continue
    fi

    if [[ "$source" != *"/facets/"* && "$name" != *"Facet"* ]]; then
      continue
    fi

    contract="$source:$name"
    if [[ -n "$link_specs" ]]; then
      normalized_bytecode=$(normalize_bytecode "$bytecode" "$link_specs")
      hash=$(cast keccak "$normalized_bytecode")
      if [[ -z "${LINKED_HASH_TO_CONTRACT[$hash]:-}" ]]; then
        LINKED_HASH_TO_CONTRACT["$hash"]="$contract"
        CONTRACT_TO_LINK_SPECS["$contract"]="$link_specs"
      fi
      continue
    fi

    if [[ ! "$bytecode" =~ ^0x[0-9a-fA-F]+$ ]]; then
      continue
    fi

    hash=$(cast keccak "$bytecode")
    if [[ -z "${HASH_TO_CONTRACT[$hash]:-}" ]]; then
      HASH_TO_CONTRACT["$hash"]="$contract"
    fi
  done < <(find "$OUT_DIR" -type f -path "*/out/*Facet.sol/*.json" -print0)
  local hash_count
  hash_count=$(printf '%s\n' "${!HASH_TO_CONTRACT[@]}" "${!LINKED_HASH_TO_CONTRACT[@]}" | sed '/^$/d' | wc -l | tr -d ' ')
  echo "Loaded ${hash_count} facet bytecode hash template(s)"
}

get_facet_addresses() {
  local proxy="$1"
  local raw
  if ! raw=$(verify_with_retry "facetAddresses for $proxy" cast call --rpc-url "$RPC_URL" "$proxy" "facetAddresses()(address[])" 2>&1); then
    echo "    - WARNING: failed to inspect $proxy via facetAddresses(); skipping live facet discovery" >&2
    echo "      $raw" >&2
    return 1
  fi
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

load_facets_for_network() {
  local network="$1"
  jq -r ".networks[] | select(.name==\"$network\") | .FACETS | to_entries[]? | .value" \
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
  local -A expected_facets=()
  local display_name="${network:-custom}"
  local unknown_facet_count=0
  local unknown_codehash_count=0
  local skipped_proxy_count=0
  local -a unknown_codehash_messages=()
  local -a verifier_args=(--verifier etherscan)

  if [[ -n "$VERIFIER_URL" ]]; then
    verifier_args+=(--verifier-url "$VERIFIER_URL")
  elif [[ "$chain_id" == "11155420" ]]; then
    verifier_args+=(--verifier-url "https://api.etherscan.io/v2/api?chainid=11155420")
  fi

  if [[ -n "$network" ]]; then
    while read -r facet_impl; do
      [[ -z "$facet_impl" ]] && continue
      expected_facets["$(echo "$facet_impl" | tr '[:upper:]' '[:lower:]')"]="$facet_impl"
    done < <(load_facets_for_network "$network")
  fi

  echo "Network: $display_name"
  echo "  - Using RPC: $rpc_url"
  echo "  - Using chain-id: $chain_id"
  echo "  - Inspecting ${#proxies[@]} proxy(s)"
  if [[ ${#expected_facets[@]} -gt 0 ]]; then
    echo "  - Checking against ${#expected_facets[@]} facet implementation(s) from config/networks.json"
  fi

  for proxy in "${proxies[@]}"; do
    echo "  - Inspecting proxy: $proxy"
    if ! facet_addresses=$(get_facet_addresses "$proxy"); then
      skipped_proxy_count=$((skipped_proxy_count + 1))
      continue
    fi
    while read -r facet; do
      [[ -z "$facet" ]] && continue
      facet_lc=$(echo "$facet" | tr '[:upper:]' '[:lower:]')
      if [[ -n "${seen[$facet_lc]:-}" ]]; then
        continue
      fi
      seen["$facet_lc"]="$facet"

      if [[ ${#expected_facets[@]} -gt 0 && -z "${expected_facets[$facet_lc]:-}" ]]; then
        echo "    - ERROR: facet $facet is not declared in config/networks.json FACETS for $network"
        unknown_facet_count=$((unknown_facet_count + 1))
        continue
      fi

      echo "    - Fetching codehash for $facet"
      codehash=$(verify_with_retry "codehash for $facet on $display_name" cast codehash --rpc-url "$rpc_url" "$facet")
      if ! resolve_contract_for_bytecode "$facet" "$rpc_url" "$codehash"; then
        unknown_codehash_count=$((unknown_codehash_count + 1))
        unknown_codehash_messages+=("live facet $facet")
        continue
      fi

      echo "    - Verifying $facet as $RESOLVED_CONTRACT"
      verify_resolved_contract "$facet" "$chain_id" "$facet on $display_name" "${verifier_args[@]}"
    done < <(printf '%s\n' "$facet_addresses" | sort -u)
  done

  if [[ ${#expected_facets[@]} -gt 0 ]]; then
    echo "  - Verifying all ${#expected_facets[@]} facet implementation(s) declared in config/networks.json"
    for facet_lc in "${!expected_facets[@]}"; do
      facet="${expected_facets[$facet_lc]}"
      if [[ -n "${seen[$facet_lc]:-}" ]]; then
        continue
      fi

      echo "    - Fetching codehash for declared facet $facet"
      codehash=$(verify_with_retry "declared facet codehash for $facet on $display_name" cast codehash --rpc-url "$rpc_url" "$facet")
      if ! resolve_contract_for_bytecode "$facet" "$rpc_url" "$codehash"; then
        unknown_codehash_count=$((unknown_codehash_count + 1))
        unknown_codehash_messages+=("declared facet $facet")
        continue
      fi

      echo "    - Verifying declared facet $facet as $RESOLVED_CONTRACT"
      verify_resolved_contract "$facet" "$chain_id" "declared facet $facet on $display_name" "${verifier_args[@]}"
      seen["$facet_lc"]="$facet"
    done
  fi

  local total
  total=$(printf '%s\n' "${!seen[@]}" | wc -l | tr -d ' ')
  echo "  - Done. Verified ${total} unique facet address(es)."
  if [[ "$skipped_proxy_count" -gt 0 ]]; then
    echo "  - WARNING: Skipped live facet discovery for ${skipped_proxy_count} proxy(s) that do not expose loupe selectors." >&2
  fi
  if [[ "$unknown_facet_count" -gt 0 ]]; then
    if [[ "$STRICT_FACET_MATCH" == "true" ]]; then
      echo "  - ERROR: Found ${unknown_facet_count} facet address(es) missing from config/networks.json FACETS." >&2
      return 1
    fi
    echo "  - WARNING: Found ${unknown_facet_count} live facet address(es) missing from config/networks.json FACETS; continuing because STRICT_FACET_MATCH=false." >&2
  fi
  if [[ "$unknown_codehash_count" -gt 0 ]]; then
    echo "  - INFO: Skipped source mapping for ${unknown_codehash_count} facet address(es) with unknown codehashes."
    local preview_count=${#unknown_codehash_messages[@]}
    if [[ "$preview_count" -gt 5 ]]; then
      preview_count=5
    fi
    local i
    for ((i=0; i<preview_count; i++)); do
      echo "    - ${unknown_codehash_messages[$i]}"
    done
    if [[ ${#unknown_codehash_messages[@]} -gt "$preview_count" ]]; then
      echo "    - ... and $(( ${#unknown_codehash_messages[@]} - preview_count )) more"
    fi
  fi
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
    if [[ -n "$NETWORK" ]]; then
      echo "No proxies configured for $NETWORK. Verifying declared FACETS only."
    else
      echo "No proxies provided. Use --network or --proxy." >&2
      usage
      exit 1
    fi
  fi

  verify_network "$NETWORK" "$CHAIN_ID" "$RPC_URL" "${PROXIES[@]}"
fi
