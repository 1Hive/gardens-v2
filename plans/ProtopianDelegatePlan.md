# Protopian Delegation And Cross-Chain Role Sync

## Summary
Add a new all-chains cron sync for Protopians/Keepers sourced from distinct mainnet subgraph `Member` role holders, rename the factory allowlist to `authorizedWallets`, add direct on-chain Protopian delegation, and make community Protopian state rely only on subgraph `RegistryCommunity.protopianDelegatedFrom` plus the existing hardcoded `1hive` slot.

## Contract Changes
- In `RegistryFactory`:
  - rename `streamRebalanceCallerAllowlist` to `authorizedWallets`;
  - rename `setStreamRebalanceCaller` to `setAuthorizedWallet`;
  - rename `isStreamRebalanceCallerAllowed` to `isAuthorizedWallet`;
  - rename event `StreamRebalanceCallerAllowlistSet` to `AuthorizedWalletSet(address indexed wallet, bool authorized)`.
- Add end-of-layout storage:
  ```solidity
  mapping(address => address) public protopianDelegate;
  ```
- Add:
  ```solidity
  event ProtopianDelegated(address indexed from, address indexed to);
  ```
- Add `onlyOwnerOrAuthorizedWallet()` and use it for `setProtopianAddress` and `setKeeperAddress`.
- Add `delegateProtopian(address from, address to)` callable by `owner`, `authorizedWallets[msg.sender]`, or `msg.sender == from`.
- Delegation rules:
  - require `protopiansAddresses[from] == true`;
  - `to` may be zero address for undelegation;
  - load `currentDelegate = protopianDelegate[from]`;
  - if `currentDelegate != address(0)` and `currentDelegate != to`, set `protopiansAddresses[currentDelegate] = false`;
  - if `to == address(0)`, clear `protopianDelegate[from]`, set `protopiansAddresses[from] = true`;
  - else set `protopianDelegate[from] = to`, set `protopiansAddresses[from] = false`, set `protopiansAddresses[to] = true`;
  - emit `ProtopianDelegated(from, to)` once.
- Keep `setProtopianAddress` / `setKeeperAddress` emitting `ProtopiansChanged` / `KeepersChanged`.
- Update `IRegistryFactory` and streaming facet authorization checks to use `isAuthorizedWallet`.

## Subgraph Changes
- Add entities:
  ```graphql
  type Protopian @entity(immutable: false) {
    id: ID!
    address: String!
  }

  type Keeper @entity(immutable: false) {
    id: ID!
    address: String!
  }
  ```
- Rename `RegistryFactory.rebalanceCallerAllowlist` to `authorizedWallets`.
- Add optional field on `RegistryCommunity`:
  ```graphql
  protopianDelegatedFrom: String
  ```
- Add event handling for:
  - `AuthorizedWalletSet(indexed address,bool)`
  - `ProtopianDelegated(indexed address,indexed address)`
- Mapping behavior:
  - `handleProtopiansChanged`: create/delete `Protopian`; keep `Member.isProtopian`.
  - `handleKeepersChanged`: create/delete `Keeper`; keep `Member.isKeeper`.
  - `handleAuthorizedWalletSet`: maintain `RegistryFactory.authorizedWallets`.
  - `handleProtopianDelegated`:
    - first clear any previously delegated community for that `from` by scanning/looking up `RegistryCommunity` entities where `protopianDelegatedFrom == from` and setting them to `null`;
    - then, if `to` is an existing community id, set only that community’s `protopianDelegatedFrom = from`;
    - if `to == address(0)` or `to` is a non-community address, leave all communities cleared.
- This ensures the subgraph maintains at most one delegated community per Protopian, even if historical events or chain state changed.

## Cron Job
- Add a new cron-secret-gated route in `apps/web` for syncing Protopians/Keepers on all production chains.
- Source of truth:
  - query the **mainnet subgraph** `Member` entity for `isProtopian: true` and `isKeeper: true`;
  - distinct those addresses;
  - do not use Alchemy for this sync.
- Sync algorithm per production chain:
  - query that chain’s subgraph `protopians` and `keepers`;
  - additions = mainnet distinct role holders missing on that chain;
  - removals = chain-indexed role holders missing from mainnet distinct role holders;
  - read `protopiansAddresses` / `keepersAddresses` on each target factory before writing;
  - call `setProtopianAddress` / `setKeeperAddress` only when at least one actual on-chain change is needed.

## Frontend Changes
- Remove community Protopian logic based on:
  - Alchemy Protopian owner fetches,
  - council Safe owner NFT ownership,
  - council Safe address NFT ownership.
- Community list/detail should rely only on:
  - `registryCommunity.protopianDelegatedFrom`,
  - plus the hardcoded `1hive` slot staying first.
- Community page:
  - add direct contract-write button on the community page;
  - show `Delegate protopian` when the connected wallet holds the mainnet Protopian NFT and `protopianDelegatedFrom` is null;
  - show `Undelegate Protopian` when `protopianDelegatedFrom == connectedWallet`;
  - disable when the wallet holds the NFT but `protopianDelegatedFrom` is another address;
  - write directly to `RegistryFactory.delegateProtopian(from, to)` via wagmi.
- Wallet dropdown:
  - keep NFT balance checks only for NFT art display;
  - remove delegation UI from the dropdown.

## Test Plan
- Contracts:
  - renamed `authorizedWallets` setter/getter/event;
  - owner-or-authorized access for bulk setters;
  - `delegateProtopian` callable by owner, authorized wallet, or `from`;
  - `from` must already be a Protopian holder;
  - delegate to community, delegate to non-community address, undelegate with zero address;
  - previous delegate gets cleared when switching;
  - storage layout check updated for renamed mapping + `protopianDelegate`.
- Subgraph:
  - codegen/build after schema and event changes;
  - verify `Protopian`, `Keeper`, `authorizedWallets`, and `RegistryCommunity.protopianDelegatedFrom`;
  - verify `ProtopianDelegated` clears any prior community for the same `from` before assigning the new one;
  - verify `to == zero` clears the current delegated community.
- Web:
  - community list/detail no longer use Alchemy/Safe-owner Protopian checks;
  - community page button visibility/label/disabled state follows `protopianDelegatedFrom` + wallet mainnet NFT balance;
  - direct contract write path works through wagmi;
  - new cron route auth, no-op writes, additions, removals, and all-chain iteration.

## Assumptions
- “Mainnet balance of the subgraph Member entity” means mainnet subgraph `Member.isProtopian` / `Member.isKeeper` is the sync source of truth.
- `RegistryCommunity.protopianDelegatedFrom` represents only delegation to a community address.
- If `to` is a non-community address, the subgraph clears any prior community delegation for `from` and assigns no new community.
- `1hive` remains hardcoded at the top regardless of Protopian delegation state.
