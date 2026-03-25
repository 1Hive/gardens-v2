# Mainnet Verification Fix Plan

## Scope

This plan is based on the `task verify-all-mainnets` output provided on 2026-03-22.
That verifier run happened before the `CVStreamingFacet` cut fix that added the missing streaming selectors to strategy cuts.

Current status:
- Global verifier: passed for `arbitrum`, `optimism`, `polygon`, `gnosis`, `base`, `celo`
- Factory dry-run verifier: passed for all listed mainnets
- State verifier: original failures were on `arbitrum`, `optimism`, `polygon`, `gnosis`, `base`, `celo`
- `celo` rerun confirms the same state-verifier drift
- `optimism` has since had `runCommunities("optimism")` broadcast successfully on March 22, 2026, so the old Optimism failure mode in the original batch is stale

Implication:
- any strategy-diamond or community-diamond conclusions from this run should be treated as stale until `task verify-all-mainnets` is rerun after the streaming facet cut fix
- the concrete failures below are restricted to the failures that are explicitly visible in the pasted output

## Failure Summary

### 1. Streaming escrow factory implementation mismatch

Networks affected:
- `arbitrum`
- `polygon`
- `base`

Observed pattern:
- `ENVS.STREAMING_ESCROW_FACTORY` points to the proxy correctly
- state verifier loads the live ERC1967 implementation slot from that proxy
- `IMPLEMENTATIONS.STREAMING_ESCROW_FACTORY` in `config/networks.json` does not match the live slot

Concrete live implementations from the verifier trace:
- `arbitrum`: live proxy impl = `0x397725722dd056fe4f035f810d4dd169d7c9a507`
- `polygon`: live proxy impl = `0xa2bb0c695b420d87242dc8a241a9ceb5d56d48e0`
- `base`: live proxy impl = `0x0313e516f87c385795977f2d555b546822cb9674`

Action:
- update `.IMPLEMENTATIONS.STREAMING_ESCROW_FACTORY` for those networks to the live proxy implementation values

Validation:
- rerun `task verify-all-mainnets`
- or narrower, rerun the state verifier for each network after patching

## 2. Optimism remaining template mismatch after communities upgrade

Network affected:
- `optimism`

Update since the original batch:
- `runCommunities("optimism")` was broadcast successfully
- post-upgrade direct check now shows `RegistryFactory::streamingEscrowFactory()` works again
- direct call result:
  - `cast call 0x1FAC47Cf25f1ca9F20ba366099D26b28401F5715 'streamingEscrowFactory()(address)' --rpc-url "$RPC_URL_OPT"`
  - returns `0x71520D667f5ab45F68c4E8455FfA1F9a7F792eAc`

Current remaining failure:
- post-upgrade `forge script script/VerifyNetworkConfigState.s.sol:VerifyNetworkConfigState --sig 'run(string)' optimism`
  now fails with:
  - `factory registryCommunityTemplate mismatch`

Action:
1. Treat the old ABI-mismatch conclusion as obsolete
2. Align the Optimism factory community template with the newly deployed community implementation
3. Rerun direct state verification after the template update

Checks:
```bash
cast call 0x1FAC47Cf25f1ca9F20ba366099D26b28401F5715 'streamingEscrowFactory()(address)' --rpc-url "$RPC_URL_OPT"
cast call 0x1FAC47Cf25f1ca9F20ba366099D26b28401F5715 'registryCommunityTemplate()(address)' --rpc-url "$RPC_URL_OPT"
jq -r '.networks[] | select(.name=="optimism") | .IMPLEMENTATIONS.REGISTRY_COMMUNITY' config/networks.json
```

Values currently observed:
- live factory `registryCommunityTemplate()` = `0xD0cC9215D9f5E236C68E66AEaAbb89Aa9433BB5f`
- config `IMPLEMENTATIONS.REGISTRY_COMMUNITY` = `0x5Ae1dAa026e2AEacf3102F8934924FDd1a97cc71`

Likely fix:
- run the scoped Optimism factory template update for community template
- if needed, also reconcile `config/networks.json` once the intended live template is confirmed

## 3. Streaming escrow implementation mismatch

Networks affected:
- `gnosis`
- `celo`

Observed pattern:
- `IMPLEMENTATIONS.STREAMING_ESCROW_FACTORY` matches the live proxy implementation
- `streamingEscrowFactory()` on the factory returns the expected proxy
- the failure happens later when verifying `escrowImplementation()` exposed by that factory
- `IMPLEMENTATIONS.STREAMING_ESCROW` in `config/networks.json` does not match the live value returned by the factory

Concrete live escrow implementations from the verifier trace:
- `gnosis`: live escrow impl = `0x7294Fbd4448d8Ecbbb8C0FE2EF792445DD35a7bf`
- `celo`: live escrow impl = `0xaF086A6e8a26b9F34730c84C9ac7c9FC2084201C`

Config values seen by verifier:
- `gnosis`: config `IMPLEMENTATIONS.STREAMING_ESCROW` = `0x2728DAFB4fAA136c3aEd61C4fD1B79043677320F`
- `celo`: config `IMPLEMENTATIONS.STREAMING_ESCROW` = `0x1c58323aCaFE51dA8A6b6B3AaB89656C3Fef1253`

Action:
- update `.IMPLEMENTATIONS.STREAMING_ESCROW` for `gnosis` and `celo` to the live values returned by `escrowImplementation()`

Validation:
```bash
cast call <streaming_escrow_factory_proxy> 'escrowImplementation()(address)' --rpc-url <network_rpc>
```

Then rerun verifier.

## 4. Arbitrum `createPool` bootstrap ownership regression

Network affected:
- `arbitrum`

Observed pattern:
- external `RegistryCommunity.createPool(...)` is not owner-gated
- but a real payload simulation on Arbitrum against community `0xe8cb705f0f29c554e71972af1bfbe16bb2673683`
  reverts during strategy bootstrap with:
  - `Ownable: caller is not the owner`
- the revert happens after the new strategy proxy is deployed, when `_configureStrategyFacets(...)`
  calls `strategyProxy.diamondCut(...)`

Concrete trace path:
- community `createPool(...)`
- deploy strategy proxy
- `CVStrategy.init(...)`
- `_configureStrategyFacets(...)`
- `CVStrategy.diamondCut(...)`
- `_checkOwner()`
- revert `Ownable: caller is not the owner`

Interpretation:
- this is not a public `createPool` auth restriction
- it is an internal strategy bootstrap/auth mismatch on Arbitrum

Cross-chain check:
- representative simulations on `optimism`, `gnosis`, and `celo` did not reproduce the same `Ownable` revert
- those chains failed earlier on `ArbitratorNotAllowed(...)` with the generic test payload, which is expected for a non-chain-specific payload
- so this bootstrap ownership regression is only confirmed on `arbitrum` right now

Action:
1. inspect the live Arbitrum strategy template / bootstrap auth path
2. patch the strategy bootstrap so initial `diamondCut` is allowed during creation
3. add a regression test that `community.createPool(...)` succeeds through the normal bootstrap path
4. after patching, rerun an Arbitrum `createPool` simulation with a real chain-valid payload

## Execution Plan

### Phase 1: Config-only fixes

Patch `pkg/contracts/config/networks.json` with the live values already visible in the verifier trace:

- `arbitrum.IMPLEMENTATIONS.STREAMING_ESCROW_FACTORY`
  - set to `0x397725722dd056fe4f035f810d4dd169d7c9a507`
- `polygon.IMPLEMENTATIONS.STREAMING_ESCROW_FACTORY`
  - set to `0xa2bb0c695b420d87242dc8a241a9ceb5d56d48e0`
- `base.IMPLEMENTATIONS.STREAMING_ESCROW_FACTORY`
  - set to `0x0313e516f87c385795977f2d555b546822cb9674`
- `gnosis.IMPLEMENTATIONS.STREAMING_ESCROW`
  - set to `0x7294Fbd4448d8Ecbbb8C0FE2EF792445DD35a7bf`
- `celo.IMPLEMENTATIONS.STREAMING_ESCROW`
  - set to `0xaF086A6e8a26b9F34730c84C9ac7c9FC2084201C`

### Phase 2: Optimism decision

Update after March 22, 2026 execution:
- `runCommunities("optimism")` succeeded on-chain
- the remaining Optimism issue is now factory community template alignment, not the old factory ABI problem

Next Optimism step:
- run the scoped factory template update for `registryCommunityTemplate`
- rerun direct state verification

Likely follow-up after that:
- rerun `task verify-all-optimism`

### Phase 3: Arbitrum strategy bootstrap fix

- investigate and patch the Arbitrum-only confirmed `createPool` bootstrap ownership revert
- check whether the final fix should be deployed only where reproduced, rather than assuming it is needed on every chain

### Phase 4: Rerun verification

After Phase 1, the Optimism template fix, and the Arbitrum bootstrap fix decision:

```bash
cd /home/corantin/Documents/GitHub/gardens-v2/pkg/contracts
task verify-all-mainnets
```

If you want a faster feedback loop before the full batch:
- run per-network state verification first for the patched networks
- then run the full task once the state verifier is clean

## Risk Notes

- Most failures here look like config drift, not live contract corruption.
- `optimism` no longer looks like an ABI-version problem; the confirmed remaining issue is factory community template drift after a successful communities upgrade.
- `arbitrum` now has one confirmed functional regression outside the verifier output: `createPool` strategy bootstrap reverts internally with `Ownable: caller is not the owner`.
- Do not assume the Arbitrum `createPool` issue exists on every chain; the quick simulations so far do not show the same failure on `optimism`, `gnosis`, or `celo`.
- Because this run predates the streaming facet cut fix, do not use it as evidence for any remaining strategy facet selector issues on mainnet.
- `celo` is no longer partial: the confirmed on-chain/config issue is `IMPLEMENTATIONS.STREAMING_ESCROW` drift.

## Suggested Next Commands

### Config validation commands

```bash
cast implementation 0xbe52a852eaf824cd221aa55c3ee054f6c8c712df --rpc-url "$RPC_URL_ARB"
cast implementation 0x856a184c5547a0945f66d0583d4c223813be1651 --rpc-url "$RPC_URL_POLYGON"
cast implementation 0x3b3333665de09494c2491171c06a6a161f319032 --rpc-url "$RPC_URL_BASE"
cast call 0x7472b2197b38233a97d0134d62ccd38aa4b93112 'escrowImplementation()(address)' --rpc-url "$RPC_URL_GNOSIS"
cast call 0xa2e7637a6ffd7576b7352ec7a34b9ee38e7e7e6c 'escrowImplementation()(address)' --rpc-url "$RPC_URL_CELO"
```

### Optimism checks

```bash
cast call 0x1FAC47Cf25f1ca9F20ba366099D26b28401F5715 'streamingEscrowFactory()(address)' --rpc-url "$RPC_URL_OPT"
cast call 0x1FAC47Cf25f1ca9F20ba366099D26b28401F5715 'registryCommunityTemplate()(address)' --rpc-url "$RPC_URL_OPT"
jq -r '.networks[] | select(.name=="optimism") | .IMPLEMENTATIONS.REGISTRY_COMMUNITY' config/networks.json
forge script script/VerifyNetworkConfigState.s.sol:VerifyNetworkConfigState --rpc-url "$RPC_URL_OPT" --sig 'run(string)' optimism
```

### Arbitrum `createPool` check

```bash
cast call 0xe8cb705f0f29c554e71972af1bfbe16bb2673683 'owner()(address)' --rpc-url "$RPC_URL_ARB"
cast call 0xe8cb705f0f29c554e71972af1bfbe16bb2673683 'councilSafe()(address)' --rpc-url "$RPC_URL_ARB"
cast call --trace 0xe8cb705f0f29c554e71972af1bfbe16bb2673683 \
  "createPool(address,((uint256,uint256,uint256,uint256),uint8,uint8,(uint256),(address,address,uint256,uint256,uint256,uint256),address,address,address,uint256,address[],address,uint256),(uint256,string))" \
  0x0000000000000000000000000000000000000000 \
  "((3656188,133677,9999903,0),0,0,(0),(0x1c62F449058BbeeD546823A1a581D28233f7A69c,0x1B8C7f06F537711A7CAf6770051A43B4F3E69A7e,2000000000000000,1000000000000000,1,604800),0xe8cb705f0f29c554e71972af1bfbe16bb2673683,0x0000000000000000000000000000000000000000,0x0000000000000000000000000000000000000000,0,[0x0000000000000000000000000000000000000000],0x0000000000000000000000000000000000000000,0)" \
  "(1,\"QmVirVcCTPF4fTQn586B3FpxQgoY2H9uFPHbaGi84Dm2vD\")" \
  --from 0xBe7Bd60a6619cB436e1A3B8D6d5D6F4B37eABD4e \
  --rpc-url "$RPC_URL_ARB"
```
