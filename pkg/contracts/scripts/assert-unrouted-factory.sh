#!/usr/bin/env bash
set -euo pipefail

network="${1:?usage: assert-unrouted-factory.sh <network> <rpc-url>}"
rpc_url="${2:?usage: assert-unrouted-factory.sh <network> <rpc-url>}"
config="$(dirname "$0")/../config/networks.json"
chain_id="$(jq -r --arg network "$network" '.networks[] | select(.name == $network) | .chainId' "$config")"
factory="$(jq -r --arg network "$network" '.networks[] | select(.name == $network) | .PROXIES.REGISTRY_FACTORY' "$config")"
[[ -n "$chain_id" && "$chain_id" != null && -n "$factory" && "$factory" != null ]] || {
  echo "Unknown network or missing factory: $network" >&2
  exit 1
}
[[ "$(cast chain-id --rpc-url "$rpc_url")" == "$chain_id" ]] || {
  echo "RPC chain ID does not match $network" >&2
  exit 1
}

release_address() {
  local output
  if output="$(cast call "$factory" "$1()(address)" --rpc-url "$rpc_url" 2>&1)"; then
    [[ "$output" =~ ^0x[0-9a-fA-F]{40}$ ]] || { echo "Unexpected factory response" >&2; return 1; }
    printf '%s\n' "$output"
  elif [[ "$output" == *"execution reverted"* || "$output" == *"function selector was not recognized"* ]]; then
    printf '%s\n' unsupported
  else
    echo "Cannot read factory routing state; check the RPC connection" >&2
    return 1
  fi
}

strategy="$(release_address strategyImplementation)"
community="$(release_address communityImplementation)"
if [[ "$strategy" == unsupported && "$community" != unsupported ]] ||
   [[ "$community" == unsupported && "$strategy" != unsupported ]]; then
  echo "Factory release getters disagree; refusing legacy upgrade" >&2
  exit 1
fi
zero=0x0000000000000000000000000000000000000000
if [[ "$strategy" != unsupported && ( "$strategy" != "$zero" || "$community" != "$zero" ) ]]; then
  echo "$network uses shared routing; use task prepare-shared-release instead of legacy upgrade" >&2
  exit 1
fi
echo "$network has no active shared release; legacy upgrade preflight passed"
