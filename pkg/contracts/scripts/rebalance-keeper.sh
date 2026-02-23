#!/usr/bin/env bash

set -euo pipefail

# Rebalance keeper for CVStrategy streaming pools.
# Requires foundry `cast` on PATH.
#
# Env:
# - RPC_URL (required)
# - KEEPER_PRIVATE_KEY (required)
# - SUBGRAPH_URL (required if STRATEGIES unset)
# - STRATEGIES (optional): comma-separated strategy addresses override
# - DRY_RUN (optional): 1 -> do not send txs
# - MIN_SECONDS_LEFT (optional): if cooldown time left > this, skip (default 3)
# - SUBGRAPH_PAGE_SIZE (optional): pagination size for strategy discovery (default 500)
# - GAS_PRICE_GWEI (optional): force gas price
# - PRIORITY_GAS_GWEI (optional): force priority gas
# - LEGACY_TX (optional): 1 -> use legacy tx type
#
# Example:
# RPC_URL=... \
# KEEPER_PRIVATE_KEY=0x... \
# SUBGRAPH_URL=https://api.thegraph.com/subgraphs/name/... \
# DRY_RUN=1 \
# bash pkg/contracts/scripts/rebalance-keeper.sh

if ! command -v cast >/dev/null 2>&1; then
  echo "[keeper] cast not found. Install Foundry first."
  exit 1
fi

if ! command -v curl >/dev/null 2>&1; then
  echo "[keeper] curl not found."
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "[keeper] jq not found."
  exit 1
fi

: "${RPC_URL:?missing RPC_URL}"
: "${KEEPER_PRIVATE_KEY:?missing KEEPER_PRIVATE_KEY}"

if [[ -z "${STRATEGIES:-}" && -z "${SUBGRAPH_URL:-}" ]]; then
  echo "[keeper] either STRATEGIES or SUBGRAPH_URL is required."
  exit 1
fi

DRY_RUN="${DRY_RUN:-0}"
MIN_SECONDS_LEFT="${MIN_SECONDS_LEFT:-3}"
SUBGRAPH_PAGE_SIZE="${SUBGRAPH_PAGE_SIZE:-500}"
GAS_PRICE_GWEI="${GAS_PRICE_GWEI:-}"
PRIORITY_GAS_GWEI="${PRIORITY_GAS_GWEI:-}"
LEGACY_TX="${LEGACY_TX:-0}"

KEEPER_ADDRESS="$(cast wallet address --private-key "$KEEPER_PRIVATE_KEY")"
CHAIN_TS_HEX="$(cast rpc --rpc-url "$RPC_URL" eth_getBlockByNumber latest false | sed -n 's/.*"timestamp":"\([^"]*\)".*/\1/p')"
CHAIN_TS="$(cast to-dec "$CHAIN_TS_HEX")"

SEND_ARGS=(--rpc-url "$RPC_URL" --private-key "$KEEPER_PRIVATE_KEY")
if [[ -n "$GAS_PRICE_GWEI" ]]; then
  SEND_ARGS+=(--gas-price "${GAS_PRICE_GWEI}gwei")
fi
if [[ -n "$PRIORITY_GAS_GWEI" ]]; then
  SEND_ARGS+=(--priority-gas-price "${PRIORITY_GAS_GWEI}gwei")
fi
if [[ "$LEGACY_TX" == "1" ]]; then
  SEND_ARGS+=(--legacy)
fi

IFS=',' read -r -a STRATEGY_ARRAY <<<"$STRATEGIES"

discover_strategies_from_subgraph() {
  local skip=0
  local found_any=0
  local all_ids=()
  while true; do
    local payload
    payload="$(
      jq -cn \
        --arg q 'query RebalanceCandidates($first: Int!, $skip: Int!) {
  cvstrategies(
    first: $first
    skip: $skip
    where: { isEnabled: true, archived: false }
  ) {
    id
    config { proposalType }
    proposals(first: 1, where: { proposalStatus_in: [1, 5] }) { id }
  }
}' \
        --argjson first "$SUBGRAPH_PAGE_SIZE" \
        --argjson skip "$skip" \
        '{query: $q, variables: {first: $first, skip: $skip}}'
    )"

    local response
    response="$(curl -sS -X POST "$SUBGRAPH_URL" -H "content-type: application/json" --data "$payload")"

    if [[ "$(echo "$response" | jq -r '.errors | length // 0')" != "0" ]]; then
      echo "[keeper] subgraph returned errors:"
      echo "$response" | jq -c '.errors'
      exit 1
    fi

    local count
    count="$(echo "$response" | jq -r '.data.cvstrategies | length')"
    if [[ "$count" == "0" ]]; then
      break
    fi

    found_any=1

    while IFS= read -r id; do
      all_ids+=("$id")
    done < <(
      echo "$response" | jq -r '
        .data.cvstrategies[]
        | select((.config.proposalType | tonumber) == 2)
        | select((.proposals | length) > 0)
        | .id
      '
    )

    if (( count < SUBGRAPH_PAGE_SIZE )); then
      break
    fi
    skip=$((skip + SUBGRAPH_PAGE_SIZE))
  done

  if [[ "$found_any" == "0" ]]; then
    echo "[keeper] no strategies returned by subgraph."
  fi

  printf "%s\n" "${all_ids[@]}" | awk 'NF' | awk '!seen[$0]++'
}

if [[ -z "${STRATEGIES:-}" ]]; then
  mapfile -t STRATEGY_ARRAY < <(discover_strategies_from_subgraph)
fi

if (( ${#STRATEGY_ARRAY[@]} == 0 )); then
  echo "[keeper] no eligible streaming strategies with active/disputed proposals; no tx sent."
  exit 0
fi

echo "[keeper] chain_ts=$CHAIN_TS keeper=$KEEPER_ADDRESS dry_run=$DRY_RUN candidates=${#STRATEGY_ARRAY[@]}"

for raw in "${STRATEGY_ARRAY[@]}"; do
  strategy="$(echo "$raw" | xargs)"
  if [[ -z "$strategy" ]]; then
    continue
  fi

  echo "[keeper] strategy=$strategy"

  # Guard 1: skip non-streaming pools (proposalType != 2).
  if ! proposal_type="$(cast call --rpc-url "$RPC_URL" "$strategy" "proposalType()(uint8)" 2>/dev/null)"; then
    echo "[keeper]   skip: proposalType() unavailable"
    continue
  fi
  proposal_type_dec="$(cast to-dec "$proposal_type")"
  if [[ "$proposal_type_dec" != "2" ]]; then
    echo "[keeper]   skip: proposalType=$proposal_type_dec (not streaming)"
    continue
  fi

  # Guard 2: cooldown pre-check to avoid obvious reverts.
  if ! last_rebalance_raw="$(cast call --rpc-url "$RPC_URL" "$strategy" "lastRebalanceAt()(uint256)" 2>/dev/null)"; then
    echo "[keeper]   skip: lastRebalanceAt() unavailable"
    continue
  fi
  if ! cooldown_raw="$(cast call --rpc-url "$RPC_URL" "$strategy" "rebalanceCooldown()(uint256)" 2>/dev/null)"; then
    echo "[keeper]   skip: rebalanceCooldown() unavailable"
    continue
  fi

  last_rebalance="$(cast to-dec "$last_rebalance_raw")"
  cooldown="$(cast to-dec "$cooldown_raw")"
  next_rebalance=$((last_rebalance + cooldown))
  seconds_left=$((next_rebalance - CHAIN_TS))

  if (( cooldown > 0 && seconds_left > MIN_SECONDS_LEFT )); then
    echo "[keeper]   skip: cooldown active (${seconds_left}s left)"
    continue
  fi

  # Guard 3: simulate call from keeper address before sending tx.
  if ! cast call --rpc-url "$RPC_URL" --from "$KEEPER_ADDRESS" "$strategy" "rebalance()" >/dev/null 2>&1; then
    echo "[keeper]   skip: simulated rebalance() would revert"
    continue
  fi

  if [[ "$DRY_RUN" == "1" ]]; then
    echo "[keeper]   dry-run: would send rebalance()"
    continue
  fi

  if tx_out="$(cast send "${SEND_ARGS[@]}" "$strategy" "rebalance()" 2>&1)"; then
    tx_hash="$(echo "$tx_out" | sed -n 's/^transactionHash[[:space:]]\+\(0x[0-9a-fA-F]\+\)$/\1/p')"
    if [[ -n "$tx_hash" ]]; then
      echo "[keeper]   sent: $tx_hash"
    else
      echo "[keeper]   sent"
    fi
  else
    echo "[keeper]   error: failed to send rebalance()"
    echo "$tx_out"
  fi
done
