# Mainnet Upgrade Handoff Context

Date: 2026-04-25
Workspace: `pkg/contracts`
Prepared for: follow-up agent to finish the remaining mainnet upgrade flow

## Objective

This handoff covers the wallet-rotation and ProxyOwner grant flow that was already executed, the Ethereum Safe batch failure that was debugged and fixed, and the exact state before resuming mainnet upgrade execution.

The next agent should use this file as the starting point instead of re-deriving the history from scratch.

## Executive Summary

- The deployer wallet was rotated and imported into the `PK_DEPLOYER` keystore.
- The new deployer address is `0xcFB802De1046D47405B3197C3cCD340ED91Ca80d`.
- Testnet grant and renounce flow was completed earlier in the session.
- Mainnet Safe proposals were submitted for the grant flow.
- All mainnets except Ethereum already show `upgradeAccess = 0xcFB802De1046D47405B3197C3cCD340ED91Ca80d` on-chain.
- Ethereum was blocked because its checked-in Safe payload still tried to call `upgradeTo(0x6da32bb79a32797a33cf00cfacd0870162140d0a)`, and that address has no code on Ethereum mainnet.
- `Taskfile.yml` was patched so the grant task now rewrites both `grantUpgradeAccess(...)` and `upgradeTo(...)` from live `config/networks.json`, then decides whether the upgrade leg should be kept using the normalized payload instead of stale transaction-builder JSON.
- A corrected Ethereum replacement Safe transaction was submitted as a grant-only replacement at Safe nonce `8`.
- Mainnet upgrade execution was intentionally paused until that Ethereum replacement Safe transaction is executed.

## Important Current State

### New deployer wallet

- Current `PK_DEPLOYER` address: `0xcFB802De1046D47405B3197C3cCD340ED91Ca80d`
- Old keystore backup retained at: `~/.foundry/keystores/PK_DEPLOYER.backup.20260424183122`

### Corrected Ethereum Safe transaction

This is the corrected replacement transaction that should be executed before running the remaining mainnet upgrade flow:

- Safe URL: `https://app.safe.global/transactions/tx?safe=eth:0x9a17De1f0caD0c592F656410997E4B685d339029&id=multisig_0x9a17De1f0caD0c592F656410997E4B685d339029_0x701bf4062c26c76849cb8d37d1b500b832926abac2f12925b4e7d8ee5008fadb`
- Safe nonce: `8`
- Intended action: `grantUpgradeAccess(0xcFB802De1046D47405B3197C3cCD340ED91Ca80d)` only

### Why Ethereum failed originally

The previous Ethereum Safe batch failed because it contained:

- `upgradeTo(0x6da32bb79a32797a33cf00cfacd0870162140d0a)`
- `grantUpgradeAccess(0xcFB802De1046D47405B3197C3cCD340ED91Ca80d)`

The failing part was `upgradeTo(...)`, not `grantUpgradeAccess(...)`.

Direct checks performed earlier in the session established:

- Ethereum ProxyOwner implementation slot currently points to `0x3a627c831d6dc71bae25a3e2647df0d3b35d2f39`
- `cast code 0x6da32bb79a32797a33cf00cfacd0870162140d0a --rpc-url "$RPC_URL_ETHEREUM"` returned no code
- `cast call <proxy_owner> 'upgradeTo(address)' 0x6da32... --from <safe> --rpc-url "$RPC_URL_ETHEREUM"` reverted
- `cast call <proxy_owner> 'grantUpgradeAccess(address)' 0xcFB802... --from <safe> --rpc-url "$RPC_URL_ETHEREUM"` succeeded

## Code Changes Already Made

### 1. Safe payload normalization fix

File: `pkg/contracts/Taskfile.yml`

The `submit-safe-payloads-grant-upgrade-access-all-chains` flow was updated so it now:

- reads `IMPLEMENTATIONS.PROXY_OWNER` from `config/networks.json`
- computes fresh `upgradeTo(address)` calldata from that live implementation
- rewrites the temporary chain payload for `upgradeTo` and `grantUpgradeAccess`
- rewrites both transactions' `to` address to the live chain ProxyOwner
- compares the live implementation against the normalized temporary payload, not the stale checked-in JSON

This prevents stale transaction-builder payloads from causing wrong upgrade legs on chains whose live implementation already differs from the checked-in payload template.

### 2. Agent documentation update

File: `pkg/contracts/AGENTS.md`

Added a `Wallet Rotation And ProxyOwner Grant Flow` section documenting the operational order for:

- rotating the sender wallet
- backing up and replacing `PK_DEPLOYER`
- funding the new wallet
- granting testnet and mainnet upgrade access
- verifying grant state
- renouncing on testnets

### 3. Config and deployment state changes

File: `pkg/contracts/config/networks.json`

This file now reflects the newer sender / implementation / facet snapshot state produced during the upgrade-prep flow. Do not casually revert it.

Generated broadcast artifacts were also produced under `broadcast/RefreshFacetSnapshots.s.sol/...`. Treat those as generated outputs, not hand-maintained source.

## Verified On-Chain Mainnet State Snapshot

Latest recheck from the terminal confirmed the following `upgradeAccess()` values:

| Chain | ProxyOwner | `upgradeAccess()` |
| --- | --- | --- |
| arbitrum | `0x5Bbeb8eBa98dDB8fD0D91965748D23Ca5C8bbad6` | `0xcFB802De1046D47405B3197C3cCD340ED91Ca80d` |
| optimism | `0x129f253F78E33A0312EF8E59fae7699Ef6e8Dbef` | `0xcFB802De1046D47405B3197C3cCD340ED91Ca80d` |
| polygon | `0x7d0E4223f987FbedE709842BfD273f7cea393f24` | `0xcFB802De1046D47405B3197C3cCD340ED91Ca80d` |
| gnosis | `0x91ab7A20cC3AeE799dF908fa1B2571fE8e07394A` | `0xcFB802De1046D47405B3197C3cCD340ED91Ca80d` |
| base | `0x99ebef5e196a9e8e39d92b18663c9236661607b1` | `0xcFB802De1046D47405B3197C3cCD340ED91Ca80d` |
| celo | `0x99EBeF5E196a9e8e39d92B18663C9236661607b1` | `0xcFB802De1046D47405B3197C3cCD340ED91Ca80d` |

Ethereum was not included in that last bulk output, but it had been checked separately earlier and was still:

- Ethereum ProxyOwner: `0x0e676bcfab3286c18d1fcedaaddb632e16a2ebcb`
- Ethereum Safe: `0x9a17De1f0caD0c592F656410997E4B685d339029`
- Ethereum `upgradeAccess()`: `0x0000000000000000000000000000000000000000`

Interpretation:

- six mainnets are already granted to the new deployer wallet
- Ethereum is the only chain still pending Safe execution

## Testnet State

Earlier in the session, testnet grant + renounce was completed successfully and validated back to zero on:

- `ethsepolia`
- `arbsepolia`
- `opsepolia`

A fresh recheck at the end of this handoff attempt did not succeed because the current shell environment did not expose working Sepolia RPC values and `cast` returned connection-refused errors. The last known good state from the earlier verified run was still zero after renounce.

## Commands Already Known To Matter

### Grant-flow commands already used

From `pkg/contracts`:

```bash
task grant-upgrade-access-testnets
task submit-safe-payloads-grant-upgrade-access-all-chains-dry
task submit-safe-payloads-grant-upgrade-access-all-chains
task verify-upgrade-access
task renounce-proxy-owner-upgrade-access-testnets
```

### Important upgrade command behavior

From `pkg/contracts`:

```bash
task upgrade-all-mainnets
```

This already runs `task verify-all-mainnets` via `scripts/upgrade-all-mainnets.sh`.

That means a separate manual `task verify-all-mainnets` is usually redundant unless:

- the main upgrade script fails partway through
- you want an explicit second verification pass after manual intervention

## Recommended Next Steps For The Next Agent

1. Confirm whether the corrected Ethereum Safe replacement transaction has now been executed.
2. Re-check Ethereum `upgradeAccess()` directly:

```bash
cd pkg/contracts
setopt allexport && source .env && setopt no_allexport
proxy=$(jq -r '.networks[] | select(.name == "ethereum") | .ENVS.PROXY_OWNER' config/networks.json)
cast call "$proxy" 'upgradeAccess()(address)' --rpc-url "$RPC_URL_ETHEREUM"
```

3. Only once Ethereum returns `0xcFB802De1046D47405B3197C3cCD340ED91Ca80d`, resume the paused operational flow:

```bash
cd pkg/contracts
task transfer-gas-mainnets
task upgrade-all-mainnets
```

4. If the user still wants an explicit extra verification pass afterward, run:

```bash
cd pkg/contracts
task verify-all-mainnets
```

## Operational Cautions

- Do not revert `pkg/contracts/config/networks.json` casually. It contains meaningful updated deployment state.
- Do not rely on checked-in `transaction-builder/*-proxy-owner-upgrade-and-grant-payload.json` values for grant operations without the runtime normalization now present in `Taskfile.yml`.
- Resolve governance Safe routing via `ProxyOwner.mainOwner()` rather than assuming the ProxyOwner address itself is the Safe.
- Keep the `PK_DEPLOYER` backup keystore until funding, grant execution, upgrade execution, and any later renounce work are fully complete.
- Treat generated files under `broadcast/` as derived outputs.

## Files With Relevant Changes

- `pkg/contracts/Taskfile.yml`
- `pkg/contracts/AGENTS.md`
- `pkg/contracts/config/networks.json`
- `broadcast/RefreshFacetSnapshots.s.sol/...` generated outputs

## Minimal Resume Checklist

- Ethereum Safe replacement executed
- Ethereum `upgradeAccess()` equals `0xcFB802De1046D47405B3197C3cCD340ED91Ca80d`
- Mainnet gas transferred if needed
- `task upgrade-all-mainnets` executed
- `verify-all-mainnets` reviewed
