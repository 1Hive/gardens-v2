#!/usr/bin/env bash
set -euo pipefail

CONTRACTS_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONFIG_PATH="$CONTRACTS_ROOT/config/networks.json"
ONLY="both"
NETWORKS=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --only)
      ONLY="$2"
      shift 2
      ;;
    --network)
      NETWORKS+=("$2")
      shift 2
      ;;
    *)
      echo "Unknown argument: $1" >&2
      echo "Usage: $0 [--only pause|escrow|both] [--network <name>]..." >&2
      exit 1
      ;;
  esac
done

if [[ "$ONLY" != "pause" && "$ONLY" != "escrow" && "$ONLY" != "both" ]]; then
  echo "--only must be one of: pause, escrow, both" >&2
  exit 1
fi

if [[ ${#NETWORKS[@]} -eq 0 ]]; then
  NETWORKS=(ethereum arbitrum optimism polygon gnosis base celo)
fi

if [[ -z "${ETHERSCAN_API_KEY:-}" ]]; then
  echo "ETHERSCAN_API_KEY must be set" >&2
  exit 1
fi

rpc_env_name() {
  case "$1" in
    ethsepolia) echo "RPC_URL_SEP_TESTNET" ;;
    arbsepolia) echo "RPC_URL_ARB_TESTNET" ;;
    opsepolia) echo "RPC_URL_OP_TESTNET" ;;
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

verifier_url() {
  case "$1" in
    ethsepolia) echo "https://eth-sepolia.blockscout.com/api/" ;;
    arbsepolia) echo "https://arbitrum-sepolia.blockscout.com/api/" ;;
    opsepolia) echo "https://api.etherscan.io/v2/api?chainid=11155420" ;;
    ethereum|mainnet) echo "https://api.etherscan.io/v2/api?chainid=1" ;;
    arbitrum) echo "https://arbitrum.blockscout.com/api/" ;;
    optimism) echo "https://optimism.blockscout.com/api/" ;;
    polygon) echo "https://polygon.blockscout.com/api/" ;;
    gnosis) echo "https://gnosis.blockscout.com/api/" ;;
    base) echo "https://base.blockscout.com/api/" ;;
    celo) echo "https://celo.blockscout.com/api/" ;;
    *) return 1 ;;
  esac
}

chain_id() {
  jq -r --arg n "$1" '.networks[] | select(.name == $n) | .chainId // empty' "$CONFIG_PATH"
}

json_value() {
  jq -r --arg n "$1" --arg p "$2" '
    .networks[]
    | select(.name == $n)
    | if $p == "pause" then (.ENVS.PAUSE_CONTROLLER // empty)
      elif $p == "pause_impl" then (.IMPLEMENTATIONS.PAUSE_CONTROLLER // empty)
      elif $p == "escrow" then (.ENVS.STREAMING_ESCROW_FACTORY // empty)
      elif $p == "escrow_impl" then (.IMPLEMENTATIONS.STREAMING_ESCROW_FACTORY // empty)
      else empty
      end
  ' "$CONFIG_PATH"
}

run_target() {
  local network="$1"
  local target="$2"
  local rpc_var
  local rpc_url
  local vid
  local cid

  rpc_var="$(rpc_env_name "$network")" || {
    echo "  - ERROR: unsupported network $network" >&2
    return 1
  }
  rpc_url="${!rpc_var:-}"
  if [[ -z "$rpc_url" ]]; then
    echo "  - ERROR: $rpc_var is not set" >&2
    return 1
  fi

  vid="$(verifier_url "$network")" || {
    echo "  - ERROR: no verifier URL for $network" >&2
    return 1
  }
  cid="$(chain_id "$network")"
  if [[ -z "$cid" ]]; then
    echo "  - ERROR: no chainId in networks.json for $network" >&2
    return 1
  fi

  if [[ "$target" == "pause" ]]; then
    local pause pause_impl
    pause="$(json_value "$network" pause)"
    pause_impl="$(json_value "$network" pause_impl)"
    if [[ -z "$pause" || "$pause" == "0x0000000000000000000000000000000000000000" ]]; then
      echo "  - pause: skipped, no ENVS.PAUSE_CONTROLLER"
      return 0
    fi
    if [[ -z "$pause_impl" || "$pause_impl" == "0x0000000000000000000000000000000000000000" ]]; then
      echo "  - pause: skipped, no IMPLEMENTATIONS.PAUSE_CONTROLLER"
      return 0
    fi
    bash "$CONTRACTS_ROOT/scripts/verify-global-pause-controller.sh" \
      --network "$network" \
      --rpc-url "$rpc_url" \
      --chain-id "$cid" \
      --etherscan-key "$ETHERSCAN_API_KEY" \
      --verifier-url "$vid"
    return $?
  fi

  local escrow escrow_impl
  escrow="$(json_value "$network" escrow)"
  escrow_impl="$(json_value "$network" escrow_impl)"
  if [[ -z "$escrow" || "$escrow" == "0x0000000000000000000000000000000000000000" ]]; then
    echo "  - escrow: skipped, no ENVS.STREAMING_ESCROW_FACTORY"
    return 0
  fi
  if [[ -z "$escrow_impl" || "$escrow_impl" == "0x0000000000000000000000000000000000000000" ]]; then
    echo "  - escrow: skipped, no IMPLEMENTATIONS.STREAMING_ESCROW_FACTORY"
    return 0
  fi
  bash "$CONTRACTS_ROOT/scripts/verify-streaming-escrow-factory.sh" \
    --network "$network" \
    --rpc-url "$rpc_url" \
    --chain-id "$cid" \
    --etherscan-key "$ETHERSCAN_API_KEY" \
    --verifier-url "$vid"
  return $?
}

failed=0

for network in "${NETWORKS[@]}"; do
  echo "### $network"

  if [[ "$ONLY" == "pause" || "$ONLY" == "both" ]]; then
    if run_target "$network" pause; then
      echo "✅ $network pause"
    else
      echo "❌ $network pause"
      failed=1
    fi
  fi

  if [[ "$ONLY" == "escrow" || "$ONLY" == "both" ]]; then
    if run_target "$network" escrow; then
      echo "✅ $network escrow"
    else
      echo "❌ $network escrow"
      failed=1
    fi
  fi
done

if [[ "$failed" -ne 0 ]]; then
  echo "One or more verifications failed."
  exit 1
fi

echo "All requested verifications succeeded."
