#!/usr/bin/env bash
set -euo pipefail

CHAIN="${1:-${CHAIN:-}}"
if [ -z "$CHAIN" ]; then
  echo "missing CHAIN, e.g. CHAIN=celo task rehearse-safe-payload-chain" >&2
  exit 1
fi

case "$CHAIN" in
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

PAYLOAD_FILE="${PAYLOAD_FILE:-transaction-builder/${PAYLOAD_CHAIN}-facet-upgrade-payload.json}"
if [ ! -f "$PAYLOAD_FILE" ]; then
  echo "missing payload file: $PAYLOAD_FILE" >&2
  exit 1
fi

payload_chain_id="$(jq -r '.chainId' "$PAYLOAD_FILE")"
if [ "$payload_chain_id" != "$CHAIN_ID" ]; then
  echo "payload chainId mismatch: expected $CHAIN_ID, got $payload_chain_id in $PAYLOAD_FILE" >&2
  exit 1
fi

SAFE_ADDRESS="$(jq -r '.meta.createdFromSafeAddress // empty' "$PAYLOAD_FILE")"
if [ -z "$SAFE_ADDRESS" ] || [ "$SAFE_ADDRESS" = "null" ]; then
  echo "payload missing meta.createdFromSafeAddress" >&2
  exit 1
fi

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

echo "Rehearsing $PAYLOAD_FILE on $CHAIN fork via Safe $SAFE_ADDRESS"
cast rpc --rpc-url "$LOCAL_RPC_URL" anvil_setBalance "$SAFE_ADDRESS" 0x3635C9ADC5DEA00000 >/dev/null
cast rpc --rpc-url "$LOCAL_RPC_URL" anvil_impersonateAccount "$SAFE_ADDRESS" >/dev/null

tx_count="$(jq '.transactions | length' "$PAYLOAD_FILE")"
for index in $(seq 0 $((tx_count - 1))); do
  tx_json="$(jq -c ".transactions[$index]" "$PAYLOAD_FILE")"
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
    --from "$SAFE_ADDRESS" \
    --value "$value" \
    "$to" \
    "$data" >/dev/null
done

cast rpc --rpc-url "$LOCAL_RPC_URL" anvil_stopImpersonatingAccount "$SAFE_ADDRESS" >/dev/null

if [ "${SKIP_SMOKE:-false}" = "true" ]; then
  echo "SKIP_SMOKE=true; leaving smoke test to caller"
  exit 0
fi

FORK_HEALTHCHECK_CHAIN="$CHAIN" \
FORK_HEALTHCHECK_RPC_URL="$LOCAL_RPC_URL" \
FORK_HEALTHCHECK_SKIP_IMPLEMENTATION_CHECKS="${FORK_HEALTHCHECK_SKIP_IMPLEMENTATION_CHECKS:-true}" \
forge test --match-contract ForkLifecycleHealthcheck -vvv
