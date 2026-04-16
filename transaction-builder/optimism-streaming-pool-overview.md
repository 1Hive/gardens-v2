# Optimism Streaming Pool Overview

Target strategy: 0x2b1915a2e0293b3a434df58b921d8f7e320da077
Chain: Optimism mainnet (10)

## Current live state

- Strategy proxy: 0x2b1915a2e0293b3a434df58b921d8f7e320da077
- Registry community: 0x59C47c30DA2A0Ca7359590F023Da0284fEF83E73
- Current implementation slot: 0x428d69afa04242d61109d67bf686141a26257bb0
- Proposal type: 2
- Superfluid token: 0x99E50193F4A70B2581cF3a80ae32505a4E0337fF
- Streaming rate per second: 38051750380518
- getPoolAmount(): 10000000000000000000

## Current live facet routing by selector group

- Loupe group currently routes via 0x131aC23Dc616c7E4b1Ec8B7235c76cCfbb7a2B7D
- Admin group currently routes via 0x4D812B6A6Ac52f60CB3692a1c9575a2231780D8D
- Allocation group currently routes via 0x3c0Fc1F3D98D9f3D02da174fFDd4B9c377A6F9dc
- Dispute group currently routes via 0xE7d7BBbED3f1424FCD3f65217C692ac7e8653705
- Pause group currently routes via 0xB7F17f162715e51a446e5348B5a651C77814008A
- Power group currently routes via 0xF2d2a99D5309736904c7100b0E30cb31614a8200
- Proposal group currently routes via 0x2Cc63F051672fb3731f88064eC7499eBe0eD6171
- Sync group currently routes via 0x32eeB46f62883FFA0EC50E8D18c9bD938973d411
- Streaming group currently routes via 0xe0Db1A2D2b2b84095D3e44F043363A4d5024252B

## Refreshed target facet addresses from networks.json

- Loupe: 0x131ac23dc616c7e4b1ec8b7235c76ccfbb7a2b7d
- Admin: 0x387eb85cdec4aa938cc0c3b02e1a68dd11927757
- Allocation: 0x5c01cb95af18f0c71d85522d6582f7c8962c3be1
- Dispute: 0x6e0943e2272a4bf78262544ba413361ee6cf7e95
- Pause: 0xf290fc9fec2550a570ddcbbeb69d7ee5c0f2148c
- Power: 0x634cef21a71ddfa19ca995e40b2a5f55eb197774
- Proposal: 0x1472edcd2349d09da7a2e71f0d25d164de66a651
- Sync: 0xc24231522903b54c96b42d476bdaeaf6d937d3aa
- Streaming: 0xdf84bfbe844ffb00d4a09c7092d6acfcbed35652
- Strategy diamond init: 0x638aa6b8a9336c71fa0467272e37718e096db22e
- Strategy diamond init calldata: 0xe1c7392a

## Execution note

The batch includes an `upgradeTo(0x428d69afa04242d61109d67bf686141a26257bb0)` call because you asked to keep the target strategy upgrade leg. With the current `networks.json`, that implementation address matches the pool's current live implementation slot, so that transaction is a no-op unless the deployment map is updated first.

## Read notes

- `proposalType = 2` is consistent with this being the streaming pool.
- `poolId()` reverted on this deployment, so it is not included as a verified field in this report.
