#!/usr/bin/env bash
set -euo pipefail

CHAIN="${1:-${CHAIN:-}}"
if [ -z "$CHAIN" ]; then
  echo "missing CHAIN, e.g. CHAIN=celo task rehearse-safe-payload-chain" >&2
  exit 1
fi
if [ "$#" -gt 0 ]; then shift; fi

case "$CHAIN" in
  ethsepolia) RPC_ENV="RPC_URL_SEP_TESTNET"; CHAIN_ID=11155111; PAYLOAD_CHAIN="ethsepolia" ;;
  arbsepolia) RPC_ENV="RPC_URL_ARB_TESTNET"; CHAIN_ID=421614; PAYLOAD_CHAIN="arbsepolia" ;;
  opsepolia) RPC_ENV="RPC_URL_OP_TESTNET"; CHAIN_ID=11155420; PAYLOAD_CHAIN="opsepolia" ;;
  ethereum) RPC_ENV="RPC_URL_ETHEREUM"; CHAIN_ID=1; PAYLOAD_CHAIN="mainnet" ;;
  arbitrum) RPC_ENV="RPC_URL_ARB"; CHAIN_ID=42161; PAYLOAD_CHAIN="arbitrum" ;;
  optimism) RPC_ENV="RPC_URL_OPT"; CHAIN_ID=10; PAYLOAD_CHAIN="optimism" ;;
  polygon) RPC_ENV="RPC_URL_POLYGON"; CHAIN_ID=137; PAYLOAD_CHAIN="polygon" ;;
  gnosis) RPC_ENV="RPC_URL_GNOSIS"; CHAIN_ID=100; PAYLOAD_CHAIN="gnosis" ;;
  base) RPC_ENV="RPC_URL_BASE"; CHAIN_ID=8453; PAYLOAD_CHAIN="base" ;;
  celo) RPC_ENV="RPC_URL_CELO"; CHAIN_ID=42220; PAYLOAD_CHAIN="celo" ;;
  *) echo "unsupported CHAIN: $CHAIN" >&2; exit 1 ;;
esac

eval "RPC_URL=\${${RPC_ENV}:-}"
if [ -z "$RPC_URL" ]; then
  echo "missing ${RPC_ENV}" >&2
  exit 1
fi

if [ "$#" -gt 0 ]; then
  PAYLOAD_FILES=("$@")
else
  PAYLOAD_FILES=("${PAYLOAD_FILE:-transaction-builder/${PAYLOAD_CHAIN}-facet-upgrade-payload.json}")
fi
EXECUTOR_ADDRESS=""
EXECUTOR_MODE=""
for payload_file in "${PAYLOAD_FILES[@]}"; do
  if [ ! -f "$payload_file" ]; then
    echo "missing payload file: $payload_file" >&2
    exit 1
  fi
  payload_chain_id="$(jq -r '.chainId' "$payload_file")"
  if [ "$payload_chain_id" != "$CHAIN_ID" ]; then
    echo "payload chainId mismatch: expected $CHAIN_ID, got $payload_chain_id in $payload_file" >&2
    exit 1
  fi
  payload_safe="$(jq -r '.meta.createdFromSafeAddress // empty' "$payload_file")"
  payload_owner="$(jq -r '.meta.createdFromOwnerAddress // empty' "$payload_file")"
  if { [ -z "$payload_safe" ] && [ -z "$payload_owner" ]; } || { [ -n "$payload_safe" ] && [ -n "$payload_owner" ]; }; then
    echo "payload must specify exactly one Safe or owner executor: $payload_file" >&2
    exit 1
  fi
  if [ -n "$payload_safe" ]; then
    payload_executor="$payload_safe"
    payload_mode="Safe"
  else
    payload_executor="$payload_owner"
    payload_mode="direct owner"
  fi
  if [ -n "$EXECUTOR_ADDRESS" ] && { [ "${payload_executor,,}" != "${EXECUTOR_ADDRESS,,}" ] || [ "$payload_mode" != "$EXECUTOR_MODE" ]; }; then
    echo "payloads use different executors or execution modes: $payload_file" >&2
    exit 1
  fi
  EXECUTOR_ADDRESS="$payload_executor"
  EXECUTOR_MODE="$payload_mode"
done

PORT="${ANVIL_PORT:-8545}"
LOCAL_RPC_URL="${LOCAL_RPC_URL:-http://127.0.0.1:${PORT}}"
ANVIL_LOG="${ANVIL_LOG:-/tmp/gardens-rehearse-safe-payload-${CHAIN}-anvil.log}"

if [ "${USE_EXISTING_ANVIL:-false}" != "true" ]; then
  anvil \
    --fork-url "$RPC_URL" \
    --chain-id "$CHAIN_ID" \
    --port "$PORT" \
    > "$ANVIL_LOG" 2>&1 &
  ANVIL_PID=$!

  cleanup() {
    if [ "${KEEP_ANVIL:-false}" != "true" ]; then
      kill "$ANVIL_PID" >/dev/null 2>&1 || true
    fi
  }
  trap cleanup EXIT
fi

for attempt in $(seq 1 30); do
  if cast block-number --rpc-url "$LOCAL_RPC_URL" >/dev/null 2>&1; then
    break
  fi
  sleep 1
  if [ "$attempt" -eq 30 ]; then
    echo "anvil fork did not start at $LOCAL_RPC_URL" >&2
    if [ -f "$ANVIL_LOG" ]; then
      tail -80 "$ANVIL_LOG" >&2
    fi
    exit 1
  fi
done

echo "Rehearsing ${#PAYLOAD_FILES[@]} payload file(s) on $CHAIN fork via $EXECUTOR_MODE $EXECUTOR_ADDRESS"
cast rpc --rpc-url "$LOCAL_RPC_URL" anvil_setBalance "$EXECUTOR_ADDRESS" 0x3635C9ADC5DEA00000 >/dev/null
cast rpc --rpc-url "$LOCAL_RPC_URL" anvil_impersonateAccount "$EXECUTOR_ADDRESS" >/dev/null

for payload_file in "${PAYLOAD_FILES[@]}"; do
  tx_count="$(jq '.transactions | length' "$payload_file")"
  if [ "$tx_count" -eq 0 ]; then
    echo "payload has no transactions: $payload_file" >&2
    exit 1
  fi
  echo "Applying $payload_file ($tx_count transaction(s))"
  for ((index = 0; index < tx_count; index++)); do
    tx_json="$(jq -c ".transactions[$index]" "$payload_file")"
    to="$(jq -r '.to' <<<"$tx_json")"
    value="$(jq -r '.value // "0"' <<<"$tx_json")"
    data="$(jq -r '.data // "0x"' <<<"$tx_json")"
    if [ -z "$data" ] || [ "$data" = "null" ]; then
      data="0x"
    fi

    echo "[$((index + 1))/$tx_count] $to"
    cast send \
      --rpc-url "$LOCAL_RPC_URL" \
      --unlocked \
      --from "$EXECUTOR_ADDRESS" \
      --value "$value" \
      "$to" \
      "$data" >/dev/null
  done
done

cast rpc --rpc-url "$LOCAL_RPC_URL" anvil_stopImpersonatingAccount "$EXECUTOR_ADDRESS" >/dev/null

if [ "${SKIP_SMOKE:-false}" = "true" ]; then
  echo "SKIP_SMOKE=true; leaving smoke test to caller"
  exit 0
fi

FORK_HEALTHCHECK_CHAIN="$CHAIN" \
FORK_HEALTHCHECK_RPC_URL="$LOCAL_RPC_URL" \
FORK_HEALTHCHECK_SKIP_IMPLEMENTATION_CHECKS="${FORK_HEALTHCHECK_SKIP_IMPLEMENTATION_CHECKS:-true}" \
forge test --match-contract ForkLifecycleHealthcheck -vvv
