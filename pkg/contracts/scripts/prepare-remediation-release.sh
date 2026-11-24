#!/usr/bin/env bash
# Build ordered direct-owner release files from receipt-verified candidates.
set -euo pipefail
chain=${1:?Usage: scripts/prepare-remediation-release.sh <network>}
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
  *) echo "Unsupported network" >&2; exit 1 ;;
esac
: "${rpc:?RPC URL missing}"
: "${PK_DEPLOYER_PW:?PK_DEPLOYER_PW missing}"
password_file=$(mktemp)
chmod 600 "$password_file"
trap 'shred -u "$password_file"' EXIT
printf '%s' "$PK_DEPLOYER_PW" > "$password_file"
wallet=$(cast wallet address --account PK_DEPLOYER --password-file "$password_file")
candidate() { jq -r --arg name "$chain" --arg key "$1" '.networks[] | select(.name==$name) | .CANDIDATES[$key] // empty' config/networks.json; }
active() { jq -r --arg name "$chain" --arg key "$1" '.networks[] | select(.name==$name) | .FACETS[$key] // empty' config/networks.json; }
core=$(candidate CV_STRATEGY)
community=$(candidate REGISTRY_COMMUNITY)
: "${core:?strategy candidate missing}"
: "${community:?community candidate missing}"
dir=transaction-builder/remediation-candidates
args=(--network "$chain" --rpc "$rpc" --family strategy --executor "$wallet" --implementation "$core" --storage-reviewed --out "$dir/$chain-strategy-release.json")
for key in CV_ADMIN CV_ALLOCATION CV_DISPUTE CV_PAUSE CV_POWER CV_PROPOSAL CV_STREAMING CV_SYNC_POWER; do
  new=$(candidate "$key")
  if [[ -n $new ]]; then args+=(--facet "$(active "$key"):$new"); fi
done
dispute=$(candidate CV_DISPUTE)
if [[ -n $dispute ]]; then
  args+=(--selector "$dispute:0x0e8daf2f" --selector "$dispute:0xf4a95471")
fi
node scripts/prepare-shared-release.mjs "${args[@]}" >/dev/null
node scripts/prepare-shared-release.mjs --network "$chain" --rpc "$rpc" --family community --executor "$wallet" --implementation "$community" --storage-reviewed --out "$dir/$chain-community-release.json" >/dev/null
escrow=$(candidate STREAMING_ESCROW)
if [[ -n $escrow ]]; then
  node scripts/prepare-streaming-escrow-release.mjs --network "$chain" --rpc "$rpc" --implementation "$escrow" --executor "$wallet" --out "$dir/$chain-escrow-release.json" >/dev/null
fi
for file in "$dir/$chain-"*release.json; do
  printf '%s ' "$file"
  jq -r '"transactions="+(.transactions|length|tostring)+" executor="+.meta.createdFromOwnerAddress' "$file"
done
