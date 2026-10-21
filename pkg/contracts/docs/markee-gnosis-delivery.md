# Gnosis community revenue: two-step delivery pilot

## Status and scope

Implementation and deployment preparation only. No addresses below imply a new deployment.
Do not enable the new route until the entire preflight and acceptance sequence passes.
Existing router, leaderboard, messages, streams, revenue balances and receiver remain unchanged.
The Base router's existing `setBridgeConfiguration(uint256,address,uint8)` selects a replacement adapter; no proxy upgrade is required.

The observed failure was LI.FI code 1002 for destination contract-call quotes,
while a plain Base ETH -> Gnosis WETH Relay quote was available. Increasing the
amount did not fix the destination-call route. The old Stargate-only adapter
cannot execute Relay calldata. Automatic retries cannot fix this incompatibility.

## Flow and trust boundary

1. The existing trusted Base claim keeper obtains a fresh LI.FI Relay quote to a
   community-specific Gnosis `CommunityDeliveryVault` (never to a Safe snapshot).
2. `LiFiRelayBridgeAdapter` validates chain, native input, WETH output metadata,
   community key/vault, exact input, minimum output, route selector, depositor,
   pinned fee collector/recipient, maximum 5% source fee, and order replay.
3. Relay deposits WETH in that vault. Bridge arrival is **not** claim completion.
4. Permissionless `deliver()` reads `registryCommunity.councilSafe()` at execution
   time and forwards the vault's entire WETH balance. A failed lookup or transfer
   leaves funds in the vault. There is no caller-supplied beneficiary or admin drain.
5. A dedicated authenticated serverless cron runs every five minutes, with a
   shared Redis lease, fresh simulation/nonce/balance checks, at most three
   configured communities, maximum 0.02 xDAI gas per delivery and 0.1 xDAI reserve.
   It skips balances below 0.000001 WETH. Permissionless manual delivery remains
   possible at any balance. It never resubmits within an invocation after a
   submission/receipt error.
6. Status checks validate the source adapter event and destination WETH receipt,
   then confirmed cumulative vault accounting. A provider `DONE` alone is not success.

**Provider trust:** LI.FI's RelayDepository facet explicitly does not bind its
opaque off-chain `orderId` to the receiver/chain metadata. The source keeper and
LI.FI/Relay remain trusted for order integrity and settlement. Calldata checks do
not remove that trust. Do not use this adapter for arbitrary public untrusted
quotes. Review the deployed facet against
[the upstream implementation](https://github.com/lifinance/contracts/blob/main/src/Facets/RelayDepositoryFacet.sol).
Bridge guarantees, downtime, refunds and execution fees remain provider-dependent.

The vault and adapter are non-upgradeable. Replace an adapter through the existing
router configuration; keep servicing old vaults and outstanding routes. A vault
cannot be redirected away from its immutable community/token. Delayed native
provider refunds to the adapter require owner reconciliation with the affected
community using `recoverNative(address)`; never sweep them into an unrelated
treasury or treat a refund as delivered community revenue.

Do not change a community's configured vault or the tracking adapter while it has
outstanding routes. The pilot worker/status tracker uses that configured mapping;
a future vault migration requires explicit handling of both old and new inboxes.

## Deployment preparation

Resolve addresses from `pkg/contracts/config/networks.json` and verify them on
both chains immediately before execution. Known pilot identity:

- Gnosis chain 100, community `0xe2396fe2169ca026962971d3b2e373ba925b6257`.
- Base router `0xa9d9b3a9CE7edA7000A4baD8Af0863F716eA9d30`.
- Existing Gnosis receiver `0xd6DD4D4364D2bbB8C95086E52C877fb41ec3b7aE`.
- Gnosis WETH `0x6A023CCd1ff6F2045C3309768eAd9E68F978f6e1`.
- Intended pilot owner: existing Gardens revenue owner
  `0x00BcC26E792E393217bA895f5e85AE628FC994E9`; verify current router ownership.

Before preparing any execution:

1. Confirm chain IDs, deployed code, router owner/keeper/current bridge config,
   registry `councilSafe()`, owner signer/Safe, nonce, gas and native balances.
2. Capture a current `integrator=gardens`, `allowBridges=relaydepository` quote.
   Decode it and independently verify the fee collector and recipient against
   the LI.FI deployed code and intended integrator configuration. Do not copy a
   fee recipient from an anonymous/default-integrator quote.
3. Set local preparation variables (addresses only; keep signing credentials in a keystore):
   `MARKEE_PILOT_COMMUNITY`, `MARKEE_REVENUE_OWNER`,
   `MARKEE_EXISTING_ROUTER_BASE`, `MARKEE_EXISTING_RECEIVER_GNOSIS`,
   `MARKEE_RELAY_FEE_COLLECTOR`, `MARKEE_RELAY_FEE_RECIPIENT`.
4. Dry-run on Gnosis from the repo root:

   ```sh
   forge script pkg/contracts/script/DeployMarkeeGnosisDelivery.s.sol:DeployMarkeeGnosisDelivery --rpc-url "$GNOSIS_RPC_URL"
   ```

   Only after review and explicit deployment authorization, rerun with
   `--account <approved-keystore> --broadcast`. Verify/publish source and read
   the actual vault's immutable community/token. Save its address as
   `MARKEE_PILOT_VAULT_GNOSIS`.

5. Dry-run the same script against `$BASE_RPC_URL`. Review constructor arguments,
   community mapping and ownership transfer. Separately authorize broadcast.
   Verify deployed source and all immutables/mapping/owner afterwards.
6. Record actual addresses and deployment transaction hashes in `networks.json`
   and the operational deployment record. Do not insert predicted or placeholder
   addresses into production configuration. These are concrete deployments,
   not new proxy implementations.
7. Simulate the existing router owner action on Base:
   `setBridgeConfiguration(100, NEW_ADAPTER, 3)` (`3` = LI.FI).
   Prepare a Base-only Safe payload with zero value if the owner is a Safe.
   Retain the existing remote receiver configuration. Do not execute until the
   worker, status checks and fresh quote simulation are ready.

## Server-only production environment

| Variable                                | Value/purpose                                                                                                   |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `MARKEE_LIFI_DELIVERY_ADAPTER_BASE`     | Verified new Base adapter address; absent disables new path/worker.                                             |
| `MARKEE_GNOSIS_DELIVERY_COMMUNITIES`    | JSON array `["0xe2396fe2169ca026962971d3b2e373ba925b6257"]` for this pilot; maximum 3.                          |
| `MARKEE_DELIVERY_KEEPER_PK`             | Dedicated Gnosis-only signer private key, stored only as a server secret. Never reuse the Base claim keeper.    |
| `CRON_SECRET`                           | Existing Vercel cron authentication secret.                                                                     |
| `KV_REST_API_URL` / `KV_REST_API_TOKEN` | Existing shared Redis REST configuration used by Markee authorization/leases (see store for supported aliases). |
| `LIFI_GARDENS_API_KEY`                  | Existing LI.FI integrator key, if required by the production integration.                                       |

Ensure preview deployments cannot spend from the production delivery signer.
Use separate Redis/configuration/signers for environments. Fund the dedicated
Gnosis signer with xDAI (not WETH); retain at least the 0.1 xDAI reserve.
Destination gas is sponsored by this signer, not deducted from quoted WETH.
Current amount validation requires at least 0.000001 WETH output.
Existing source-claim secrets and chain RPC configuration remain required.
Set `LIFI_INTEGRATOR_ID=gardens`, matching the new adapter's pinned integrator.
Deploy environment changes together with the application revision; verify cron auth
rejects anonymous callers, Redis is available, and the disabled worker does no writes.

## Acceptance and rollback

- Run new contract tests and web tests, typecheck, lint and build before deployment.
- Fork-test the actual quote through the actual deployed LI.FI diamond using the
  proposed adapter before switching the router. Mock tests alone are not provider acceptance.
  The opt-in `LiFiRelayBridgeForkTest` executes the captured public quote against
  a Base fork (`MARKEE_RELAY_FORK_RPC=<Base RPC> forge test --match-path
pkg/contracts/test/LiFiRelayBridgeFork.t.sol`). It replaces adapter code only
  inside the local fork to match the captured depositor. This proves source
  calldata execution, not remote settlement or deployment readiness. Refresh
  the quote and simulate with actual new addresses before activation.
- After activation and separately approved pilot spend, confirm the Base receipt,
  Relay destination receipt, vault WETH arrival, `Delivered` event, actual Safe's
  WETH balance increase and UI success. Verify keeper costs against the budget.
- Test Safe rotation locally/fork only unless governance explicitly authorizes a live rotation.
- Simulate failed delivery; verify funds stay recoverable and UI remains pending.
- Monitor balances, cron errors, pending signer nonce, provider refunds and routes
  waiting more than 15 minutes. Inspect before retrying a source claim.
- To stop new Relay claims, restore the recorded previous Base adapter/protocol.
  **Keep the worker and mapping configured for outstanding vault funds.** Do not
  remove status configuration or abandon a vault while a route is in flight.
  Stop/fix the worker separately if its signer is compromised; anyone can safely
  call `deliver()` to the current council Safe.

Pushing this change alone does not activate the new bridge route. Until deployment
and configuration are complete, the old route reports a clear no-route error and
pauses automatic quote retries.
