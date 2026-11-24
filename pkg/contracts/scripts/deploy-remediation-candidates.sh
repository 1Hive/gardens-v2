#!/usr/bin/env bash
# Deploy and receipt-verify inactive remediation targets for one supported chain.
set -euo pipefail
chain=${1:?Usage: scripts/deploy-remediation-candidates.sh <network>}
cd "$(dirname "$0")/.."
if [[ -f .env ]]; then set -a; source .env; set +a; fi
case "$chain" in
  ethsepolia) rpc=${RPC_URL_SEP_TESTNET:-} ;;
  arbsepolia) rpc=${RPC_URL_ARB_TESTNET:-} ;;
  opsepolia) rpc=${RPC_URL_OP_TESTNET:-} ;;
  arbitrum) rpc=${RPC_URL_ARB:-} ;;
  optimism) rpc=${RPC_URL_OPT:-} ;;
  polygon) rpc=${RPC_URL_POLYGON:-} ;;
  gnosis) rpc=${RPC_URL_GNOSIS:-} ;;
  base) rpc=${RPC_URL_BASE:-} ;;
  celo) rpc=${RPC_URL_CELO:-} ;;
  ethereum) rpc=${RPC_URL_ETHEREUM:-} ;;
  *) echo "Unsupported network: $chain" >&2; exit 1 ;;
esac
: "${rpc:?RPC URL missing}"
: "${PK_DEPLOYER_PW:?PK_DEPLOYER_PW missing}"
chain_id=$(jq -r --arg name "$chain" '.networks[] | select(.name==$name) | .chainId' config/networks.json)
[[ $chain_id != null && $(cast chain-id --rpc-url "$rpc") == "$chain_id" ]]
password_file=$(mktemp)
log_file=$(mktemp)
chmod 600 "$password_file" "$log_file"
trap 'shred -u "$password_file"; rm -f "$log_file"' EXIT
printf '%s' "$PK_DEPLOYER_PW" > "$password_file"
wallet=$(cast wallet address --account PK_DEPLOYER --password-file "$password_file")
proxy_owner=$(jq -r --arg name "$chain" '.networks[] | select(.name==$name) | .ENVS.PROXY_OWNER' config/networks.json)
factory=$(jq -r --arg name "$chain" '.networks[] | select(.name==$name) | .PROXIES.REGISTRY_FACTORY' config/networks.json)
for target in "$proxy_owner" "$factory"; do
  [[ ${wallet,,} == $(cast call "$target" 'owner()(address)' --rpc-url "$rpc" | tr '[:upper:]' '[:lower:]') ]]
done
[[ ${wallet,,} == $(cast call "$proxy_owner" 'upgradeAccess()(address)' --rpc-url "$rpc" | tr '[:upper:]' '[:lower:]') ]]

run() {
  if ! "$@" > "$log_file" 2>&1; then
    echo "FAILED $chain: $1" >&2
    sed -E 's#https?://[^[:space:]]+#<RPC_URL>#g' "$log_file" | tail -25 >&2
    exit 1
  fi
}
candidate() { jq -r --arg name "$chain" --arg key "$1" '.networks[] | select(.name==$name) | .CANDIDATES[$key] // empty' config/networks.json; }
broadcast() {
  jq -er --arg contract "$2" '[.transactions[] | select(.contractName==$contract and .transactionType=="CREATE")][-1] | [.contractAddress,.hash] | @tsv' "../../broadcast/$1/$chain_id/run-latest.json"
}
record() {
  local contract=$1 address=$2 tx=$3 verified=false
  shift 3
  for attempt in 1 2 3 4 5; do
    if node scripts/verify-remediation-candidate.mjs --network "$chain" --rpc "$rpc" --contract "$contract" --address "$address" --tx "$tx" "$@" --record true > "$log_file" 2>&1; then
      verified=true
      break
    fi
    sleep 2
  done
  if [[ $verified != true ]]; then
    echo "FAILED $chain: verify $contract" >&2
    sed -E 's#https?://[^[:space:]]+#<RPC_URL>#g' "$log_file" | tail -25 >&2
    exit 1
  fi
  echo "VERIFIED $chain $contract $address"
}

power_library=0xB07d76F6001Cc62739d39cb0C5E9c58E08230486
[[ $(cast code "$power_library" --rpc-url "$rpc") != 0x ]]
echo "START $chain chainId=$chain_id signer=$wallet"
lib=$(candidate CV_UTIL_LIB)
if [[ -z $lib ]]; then
  run forge create pkg/contracts/src/CVStrategy/ConvictionsUtils.sol:ConvictionsUtils --via-ir --rpc-url "$rpc" --account PK_DEPLOYER --password-file "$password_file" --broadcast --json
  lib=$(jq -er '.deployedTo' "$log_file")
  tx=$(jq -er '.transactionHash' "$log_file")
  record ConvictionsUtils "$lib" "$tx"
else
  [[ $(cast code "$lib" --rpc-url "$rpc") != 0x ]]
  echo "EXISTING $chain ConvictionsUtils $lib"
fi
export NETWORK="$chain" RPC_URL="$rpc" SHARED_TARGET_MODE=release CANDIDATE_CV_UTIL_LIB="$lib"
if [[ -z $(candidate CV_STRATEGY) ]]; then
  export SHARED_TARGET_FAMILY=strategy
  run task deploy-shared-routing-targets
  read -r address tx < <(broadcast DeploySharedRoutingTargets.s.sol CVStrategy)
  record CVStrategy "$address" "$tx" --library "$lib"
fi
for pair in CV_ADMIN:CVAdminFacet CV_ALLOCATION:CVAllocationFacet CV_DISPUTE:CVDisputeFacet CV_PAUSE:CVPauseFacet CV_POWER:CVPowerFacet CV_PROPOSAL:CVProposalFacet CV_STREAMING:CVStreamingFacet CV_SYNC_POWER:CVSyncPowerFacet; do
  key=${pair%%:*}; contract=${pair#*:}
  if [[ -n $(candidate "$key") ]]; then continue; fi
  export REFRESH_FACET_KEY=".FACETS.$key"
  latest="../../broadcast/RefreshFacetSnapshots.s.sol/$chain_id/run-latest.json"
  before=$(jq -r '.transactions[-1].hash // empty' "$latest" 2>/dev/null || true)
  run task deploy-remediation-facet
  after=$(jq -r '.transactions[-1].hash // empty' "$latest" 2>/dev/null || true)
  if [[ $before == "$after" ]]; then
    echo "UNCHANGED $chain $contract (active runtime matches artifact)"
    continue
  fi
  read -r address tx < <(broadcast RefreshFacetSnapshots.s.sol "$contract")
  if [[ $contract == CVPowerFacet ]]; then
    record "$contract" "$address" "$tx" --library "$lib" --power-library "$power_library"
  else
    record "$contract" "$address" "$tx" --library "$lib"
  fi
done
if [[ -z $(candidate REGISTRY_COMMUNITY) ]]; then
  export SHARED_TARGET_FAMILY=community
  run task deploy-shared-routing-targets
  read -r address tx < <(broadcast DeploySharedRoutingTargets.s.sol RegistryCommunity)
  record RegistryCommunity "$address" "$tx"
fi
escrow_factory=$(jq -r --arg name "$chain" '.networks[] | select(.name==$name) | .ENVS.STREAMING_ESCROW_FACTORY // empty' config/networks.json)
host=$(jq -r --arg name "$chain" '.networks[] | select(.name==$name) | .ENVS.SUPERFLUID_HOST // empty' config/networks.json)
if [[ -n $escrow_factory && $escrow_factory != 0x0000000000000000000000000000000000000000 && -n $host && $host != 0x0000000000000000000000000000000000000000 ]]; then
  if [[ -z $(candidate STREAMING_ESCROW) ]]; then
    run env SKIP_NETWORK_WRITES=true DEPLOY_ONLY=true UPGRADE_FACTORY=false DEPLOYER_ADDRESS="$wallet" ETH_PASSWORD= \
      forge script script/DeployOrUpgradeStreamingEscrows.s.sol:DeployOrUpgradeStreamingEscrows \
      --rpc-url "$rpc" --account PK_DEPLOYER --password-file "$password_file" --sig 'run(string)' "$chain" --ffi \
      --gas-estimate-multiplier "${REMEDIATION_GAS_ESTIMATE_MULTIPLIER:-130}" --slow --broadcast -v
    read -r address tx < <(broadcast DeployOrUpgradeStreamingEscrows.s.sol StreamingEscrow)
    record StreamingEscrow "$address" "$tx"
  fi
else
  echo "SKIP $chain StreamingEscrow unsupported"
fi
echo "DONE $chain"
