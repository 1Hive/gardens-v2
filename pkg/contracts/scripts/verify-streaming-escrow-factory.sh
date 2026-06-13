#!/usr/bin/env bash
set -euo pipefail
unset CHAIN

NETWORK=""
RPC_URL=""
CHAIN_ID=""
ETHERSCAN_KEY=""
VERIFIER_URL=""
COMPILER_VERSION="v0.8.23+commit.f704f362"
OPTIMIZER_RUNS="0"
EVM_VERSION="prague"
VERIFY_COMMAND_TIMEOUT=${VERIFY_COMMAND_TIMEOUT:-300}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --network)
      NETWORK="$2"
      shift 2
      ;;
    --rpc-url)
      RPC_URL="$2"
      shift 2
      ;;
    --chain-id)
      CHAIN_ID="$2"
      shift 2
      ;;
    --etherscan-key)
      ETHERSCAN_KEY="$2"
      shift 2
      ;;
    --verifier-url)
      VERIFIER_URL="$2"
      shift 2
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

if [[ -z "$NETWORK" || -z "$RPC_URL" || -z "$CHAIN_ID" || -z "$ETHERSCAN_KEY" ]]; then
  echo "Usage: $0 --network <name> --rpc-url <url> --chain-id <id> --etherscan-key <key> [--verifier-url <url>]" >&2
  exit 1
fi

CONTRACTS_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO_ROOT="$(cd "$CONTRACTS_ROOT/../.." && pwd)"
CONFIG_PATH="$CONTRACTS_ROOT/config/networks.json"

verify_with_retry() {
  local description="$1"
  shift

  local attempt=1
  local max_attempts=4
  local delay=8
  local output

  while true; do
    if output="$(timeout --foreground "$VERIFY_COMMAND_TIMEOUT" "$@" 2>&1)"; then
      printf '%s\n' "$output"
      sleep 2
      return 0
    fi
    local status=$?
    if [[ "$status" -eq 124 ]]; then
      output="Command timed out after ${VERIFY_COMMAND_TIMEOUT}s while running ${description}"
    fi

    printf '%s\n' "$output" >&2
    if [[ "$attempt" -ge "$max_attempts" ]]; then
      return 1
    fi

    if grep -Eqi 'rate limit|max calls per sec|expected value|SourcifyResponse|429|timeout' <<< "$output"; then
      echo "Retrying $description after ${delay}s (attempt $((attempt + 1))/${max_attempts})..." >&2
      sleep "$delay"
      attempt=$((attempt + 1))
      delay=$((delay * 2))
      continue
    fi

    return 1
  done
}

verifier_args=()
if [[ -n "$VERIFIER_URL" ]]; then
  verifier_args+=(--verifier-url "$VERIFIER_URL")
fi

if [[ ! -f "$CONFIG_PATH" ]]; then
  echo "Config file not found: $CONFIG_PATH" >&2
  exit 1
fi

factory_proxy="$(jq -r --arg n "$NETWORK" '.networks[] | select(.name == $n) | .ENVS.STREAMING_ESCROW_FACTORY // empty' "$CONFIG_PATH")"
factory_implementation="$(jq -r --arg n "$NETWORK" '.networks[] | select(.name == $n) | .IMPLEMENTATIONS.STREAMING_ESCROW_FACTORY // empty' "$CONFIG_PATH")"
proxy_owner="$(jq -r --arg n "$NETWORK" '.networks[] | select(.name == $n) | .ENVS.PROXY_OWNER // empty' "$CONFIG_PATH")"

if [[ -z "$factory_proxy" || -z "$factory_implementation" || -z "$proxy_owner" ]]; then
  echo "Missing STREAMING_ESCROW_FACTORY, IMPLEMENTATIONS.STREAMING_ESCROW_FACTORY, or PROXY_OWNER for $NETWORK" >&2
  exit 1
fi

host="$(cast call --rpc-url "$RPC_URL" "$factory_proxy" "host()(address)")"
escrow_implementation="$(cast call --rpc-url "$RPC_URL" "$factory_proxy" "escrowImplementation()(address)")"

if [[ -z "$host" || -z "$escrow_implementation" ]]; then
  echo "Could not resolve host or escrowImplementation from $factory_proxy on $NETWORK" >&2
  exit 1
fi

echo "Verifying StreamingEscrow implementation on $NETWORK: $escrow_implementation"
verify_with_retry "StreamingEscrow implementation on $NETWORK" forge verify-contract \
  --root "$REPO_ROOT" \
  --rpc-url "$RPC_URL" \
  --chain "$CHAIN_ID" \
  --verifier etherscan \
  --compiler-version "$COMPILER_VERSION" \
  --num-of-optimizations "$OPTIMIZER_RUNS" \
  --evm-version "$EVM_VERSION" \
  --etherscan-api-key "$ETHERSCAN_KEY" \
  "${verifier_args[@]}" \
  --watch \
  "$escrow_implementation" \
  pkg/contracts/src/CVStrategy/StreamingEscrow.sol:StreamingEscrow

echo "Verifying StreamingEscrowFactory implementation on $NETWORK: $factory_implementation"
verify_with_retry "StreamingEscrowFactory implementation on $NETWORK" forge verify-contract \
  --root "$REPO_ROOT" \
  --rpc-url "$RPC_URL" \
  --chain "$CHAIN_ID" \
  --verifier etherscan \
  --compiler-version "$COMPILER_VERSION" \
  --num-of-optimizations "$OPTIMIZER_RUNS" \
  --evm-version "$EVM_VERSION" \
  --etherscan-api-key "$ETHERSCAN_KEY" \
  "${verifier_args[@]}" \
  --watch \
  "$factory_implementation" \
  pkg/contracts/src/CVStrategy/StreamingEscrowFactory.sol:StreamingEscrowFactory

init_data="$(cast calldata "initialize(address,address,address)" "$proxy_owner" "$host" "$escrow_implementation")"
constructor_args="$(cast abi-encode "constructor(address,bytes)" "$factory_implementation" "$init_data")"

echo "Verifying StreamingEscrowFactory proxy on $NETWORK: $factory_proxy"
verify_with_retry "StreamingEscrowFactory proxy on $NETWORK" forge verify-contract \
  --root "$REPO_ROOT" \
  --rpc-url "$RPC_URL" \
  --chain "$CHAIN_ID" \
  --verifier etherscan \
  --compiler-version "$COMPILER_VERSION" \
  --num-of-optimizations "$OPTIMIZER_RUNS" \
  --evm-version "$EVM_VERSION" \
  --etherscan-api-key "$ETHERSCAN_KEY" \
  "${verifier_args[@]}" \
  --constructor-args "$constructor_args" \
  --watch \
  "$factory_proxy" \
  lib/openzeppelin-contracts/contracts/proxy/ERC1967/ERC1967Proxy.sol:ERC1967Proxy
