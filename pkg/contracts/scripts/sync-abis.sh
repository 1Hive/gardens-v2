#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

OUT_DIR="$ROOT_DIR/out"
ABI_DIR="$ROOT_DIR/abis"

if [[ ! -d "$OUT_DIR" ]]; then
  echo "Missing out directory at $OUT_DIR" >&2
  exit 1
fi

mkdir -p "$ABI_DIR"
rsync -a --delete "$OUT_DIR/" "$ABI_DIR/"

node "$ROOT_DIR/scripts/aggregate-diamond-abi.js"
