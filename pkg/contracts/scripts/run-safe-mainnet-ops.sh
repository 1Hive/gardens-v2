#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

if [[ -f .env ]]; then
  set -a
  source .env
  set +a
fi

: "${PK_DEPLOYER_PW:?missing PK_DEPLOYER_PW}"

echo "[safe-ops] killing stale verify/upgrade processes"
pkill -f 'verify-all-deployments.sh|verify-all-mainnets|UpgradeCVMultichain|task upgrade-all-mainnets|task verify-all-mainnets' || true
sleep 2

echo "[safe-ops] phase 1: factory implementation upgrade"
export PHASE=factory
export FACTORY_ACTION=upgrade-impl
task upgrade-all-mainnets

echo "[safe-ops] verify after factory phase"
export SCOPE=all
task verify-all-mainnets

echo "[safe-ops] phase 2: full upgrade"
export PHASE=all
unset FACTORY_ACTION
task upgrade-all-mainnets

echo "[safe-ops] final verify"
export SCOPE=all
task verify-all-mainnets

echo "[safe-ops] complete"
