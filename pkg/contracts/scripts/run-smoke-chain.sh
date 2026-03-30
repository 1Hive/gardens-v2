#!/usr/bin/env bash
set -euo pipefail

CHAIN="${1:?missing chain}"
MAX_ATTEMPTS="${SMOKE_RPC_MAX_ATTEMPTS:-3}"
DELAY_SECONDS="${SMOKE_RPC_INITIAL_DELAY:-5}"

retryable_failure() {
  local output="$1"
  [[ "$output" == *"HTTP error 429"* ]] || \
  [[ "$output" == *"HTTP error 500"* ]] || \
  [[ "$output" == *"operation timed out"* ]] || \
  [[ "$output" == *"Temporary internal error"* ]] || \
  [[ "$output" == *"could not instantiate forked environment"* ]] || \
  [[ "$output" == *"database error:"* ]]
}

apply_default_rpc_override() {
  case "$CHAIN" in
    arbitrum)
      export PREMIUM_RPC_URL_ARB="${PREMIUM_RPC_URL_ARB:-https://arb1.arbitrum.io/rpc}"
      ;;
    polygon)
      export PREMIUM_RPC_URL_POLYGON="${PREMIUM_RPC_URL_POLYGON:-https://polygon.drpc.org}"
      ;;
    gnosis)
      export PREMIUM_RPC_URL_GNOSIS="${PREMIUM_RPC_URL_GNOSIS:-https://gnosis.drpc.org}"
      ;;
  esac
}

apply_default_rpc_override

attempt=1
while true; do
  if output="$(FORK_HEALTHCHECK_CHAIN="$CHAIN" forge test --match-contract ForkLifecycleHealthcheck -vvv 2>&1)"; then
    printf '%s\n' "$output"
    exit 0
  fi

  printf '%s\n' "$output" >&2
  if [[ "$attempt" -ge "$MAX_ATTEMPTS" ]] || ! retryable_failure "$output"; then
    exit 1
  fi

  echo "Retrying smoke $CHAIN after ${DELAY_SECONDS}s (attempt $((attempt + 1))/${MAX_ATTEMPTS})..." >&2
  sleep "$DELAY_SECONDS"
  attempt=$((attempt + 1))
  DELAY_SECONDS=$((DELAY_SECONDS * 2))
done
