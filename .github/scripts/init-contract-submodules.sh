#!/usr/bin/env bash
set -euo pipefail

# Allo's retired EAS proxy submodule is not part of the Gardens build. Fetch the
# root dependencies recursively, then initialize only the nested Allo modules
# that Gardens imports.
git submodule sync
git submodule update --init --force --depth=1 --recursive \
  lib/__safe-smart-account \
  lib/forge-std \
  lib/openzeppelin-contracts \
  lib/openzeppelin-contracts-upgradeable \
  lib/openzeppelin-foundry-upgrades \
  lib/protocol-monorepo \
  lib/safe-smart-account

git submodule update --init --force --depth=1 lib/allo-v2
git -C lib/allo-v2 submodule sync
git -C lib/allo-v2 submodule update --init --force --depth=1 --recursive \
  lib/eas-contracts \
  lib/forge-std \
  lib/hats-protocol \
  lib/hedgey-vesting \
  lib/openzeppelin-contracts \
  lib/openzeppelin-contracts-upgradeable \
  lib/permit2 \
  lib/solady \
  lib/superfluid-protocol-monorepo \
  lib/v2-core
