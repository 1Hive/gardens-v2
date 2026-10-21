# Gnosis Markee delivery activation — 2026-10-21

## Deployed pilot

Community (Gnosis): `0xe2396fe2169ca026962971d3b2e373ba925b6257`.
Existing Base router and owner are unchanged:
`0xa9d9b3a9CE7edA7000A4baD8Af0863F716eA9d30` and
`0x00BcC26E792E393217bA895f5e85AE628FC994E9` respectively.
Existing Gnosis receiver remains `0xd6DD4D4364D2bbB8C95086E52C877fb41ec3b7aE`.

| Item                      | Address                                      | Chain        |
| ------------------------- | -------------------------------------------- | ------------ |
| CommunityDeliveryVault    | `0xFE0CDaf2a0aCd71C18A9c475bDe4AAAc4F54Bd3A` | Gnosis (100) |
| LiFiRelayBridgeAdapter    | `0xf52CF27045F03E3E67401b7c0B54111095917d76` | Base (8453)  |
| Dedicated delivery signer | `0x9fcbc092B770970A58524136EF6202CA2Caa0D73` | Gnosis (100) |

Both deployed contracts have matching source verification on Sourcify using
Solidity `0.8.23+commit.f704f362`. Neither is a proxy. Their actual addresses are
registered in `config/networks.json`; existing proxy implementation entries are unchanged.

| Transaction                                 | Hash                                                                 | Block    |
| ------------------------------------------- | -------------------------------------------------------------------- | -------- |
| Deploy vault (Gnosis)                       | `0xa1796b2da4b69b83a42fe2e581d7ce7032183b0e0525ea6bdf0487841a061023` | 48870391 |
| Deploy adapter (Base)                       | `0x8ac1fbcb5554814002f6e25e8e83bc96a84e5d2ac06b24b3a69ecff8fe3bf0e2` | 52905873 |
| Bind pilot vault (Base)                     | `0x5378a50bf8a0579f10727bad478306d1ca5491edbd604f2a9922abf14605f1bc` | 52905881 |
| Fund delivery signer with 0.2 xDAI (Gnosis) | `0x08ae725361adca187589af3377e06eabc3b658af4345ccf922a23c58b6e1726d` | 48870405 |

## Acceptance evidence

- Read back adapter owner, router, LI.FI diamond, receiver, token, fee collector,
  fee recipient and community mapping; all matched the reviewed configuration.
- Vault immutable community and Gnosis WETH matched. Delivery resolves the live
  `councilSafe()`; the observed Safe is not stored as a fixed beneficiary.
- Source execution passed using a fresh LI.FI Relay quote and the actual deployed
  adapter on a local Base fork at block 52905904. The read-only simulation used a
  router balance override, input 0.000133 ETH and minimum output
  0.000122458679799277 WETH. This is not proof of remote bridge settlement.
- Production-only adapter/community configuration and a dedicated encrypted
  delivery secret were installed. The signer was funded from the existing owner,
  not community revenue. Preview delivery is disabled in code.
- Full local production build, including type checking, passed after isolating
  webpack compilation and enabling its memory optimizations. Production build
  `c04ef793e` had failed out of memory; `9892b278f` contains the build correction.

## Activated and checked in production

The router owner activated the new chain-100 adapter, protocol 3 (LI.FI), in Base
transaction `0xe19af03c1071ca5d46e1a2455cf033955c47338c263fddbef89e768629b6fb38`
at block 52906113. The receipt succeeded and the live configuration was read back.
The previous chain-100 adapter, retained for rollback, is
`0x6D1fAd96b037547EFAcC8aa3394Bd10776a135A3`, protocol 3 (LI.FI).

Production deployment `dpl_6Uvs328gX2DXULFdtLv5rWz22zB7` of `9892b278f` reached
READY and was assigned to `app.gardens.fund` before the router switch.
The delivery endpoint rejected anonymous access with HTTP 401; an authenticated
run returned HTTP 200, `complete`, with the pilot vault `below_threshold` (empty).
This exercised the configured signer, Redis lease, adapter mapping and vault reads
without sending a delivery transaction.

After activation, the live 1Hive quote endpoint returned HTTP 200 and:

- available revenue: `210655096358898` wei ETH;
- bridge fee estimate: `11872680517800` wei ETH;
- source network fee estimate: `8071027500000` wei ETH;
- expected destination output: `190711388341098` wei WETH;
- displayed recipient: `0xc6c2E9EFB898A42DB4137B07b727b45e0C353d81`.

These are a time-specific quote, not fixed fees or evidence of a completed claim.
No community revenue was swept during activation. A separately approved real
claim must still verify Relay settlement, vault arrival, the `Delivered` event and
the Council Safe's WETH increase end to end. The Safe is resolved again at delivery.

Only the listed community has a destination vault configured. Additional Gnosis
communities require their own verified vault and worker configuration before
using this route. There are no changes to leaderboard IDs, messages or streams.

See [the operating runbook](markee-gnosis-delivery.md) for provider trust,
delivery retry semantics, refund reconciliation and rollback. If rolling back
the source adapter, keep the worker and new adapter environment configured until
all outstanding vault funds have been delivered.
