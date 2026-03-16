#!/usr/bin/env bash
set -euo pipefail

NETWORK=""
RPC_URL=""
CHAIN_ID=""
ETHERSCAN_KEY=""
VERIFIER_URL=""
COMPILER_VERSION="v0.8.23+commit.f704f362"
OPTIMIZER_RUNS="0"
EVM_VERSION="prague"

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

if [[ ! -f "$CONFIG_PATH" ]]; then
  echo "Config file not found: $CONFIG_PATH" >&2
  exit 1
fi

pause_controller="$(jq -r --arg n "$NETWORK" '.networks[] | select(.name == $n) | .ENVS.PAUSE_CONTROLLER // empty' "$CONFIG_PATH")"
implementation="$(jq -r --arg n "$NETWORK" '.networks[] | select(.name == $n) | .IMPLEMENTATIONS.PAUSE_CONTROLLER // empty' "$CONFIG_PATH")"
proxy_owner="$(jq -r --arg n "$NETWORK" '.networks[] | select(.name == $n) | .ENVS.PROXY_OWNER // empty' "$CONFIG_PATH")"

if [[ -z "$pause_controller" || -z "$implementation" || -z "$proxy_owner" ]]; then
  echo "Missing PAUSE_CONTROLLER, IMPLEMENTATIONS.PAUSE_CONTROLLER, or PROXY_OWNER for $NETWORK" >&2
  exit 1
fi

echo "Verifying GlobalPauseController implementation on $NETWORK: $implementation"
forge verify-contract \
  --root "$REPO_ROOT" \
  --rpc-url "$RPC_URL" \
  --chain "$CHAIN_ID" \
  --compiler-version "$COMPILER_VERSION" \
  --num-of-optimizations "$OPTIMIZER_RUNS" \
  --evm-version "$EVM_VERSION" \
  --etherscan-api-key "$ETHERSCAN_KEY" \
  --watch \
  "$implementation" \
  pkg/contracts/src/pausing/GlobalPauseController.sol:GlobalPauseController

init_data="$(cast calldata "initialize(address)" "$proxy_owner")"
constructor_args="$(cast abi-encode "constructor(address,bytes)" "$implementation" "$init_data")"

echo "Verifying GlobalPauseController proxy on $NETWORK: $pause_controller"
forge verify-contract \
  --root "$REPO_ROOT" \
  --rpc-url "$RPC_URL" \
  --chain "$CHAIN_ID" \
  --compiler-version "$COMPILER_VERSION" \
  --num-of-optimizations "$OPTIMIZER_RUNS" \
  --evm-version "$EVM_VERSION" \
  --etherscan-api-key "$ETHERSCAN_KEY" \
  --constructor-args "$constructor_args" \
  --watch \
  "$pause_controller" \
  lib/openzeppelin-contracts/contracts/proxy/ERC1967/ERC1967Proxy.sol:ERC1967Proxy
