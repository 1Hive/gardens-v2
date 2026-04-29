import { RegistryCommunity as CommunityTemplate } from "../../generated/templates";
import {
  RegistryFactory,
  RegistryCommunity,
  Member,
  StreamInfo,
  Protopian,
  Keeper,
  ProtopianDelegationIndex
} from "../../generated/schema";

import {
  Address,
  BigInt,
  DataSourceContext,
  dataSource,
  log,
  store
} from "@graphprotocol/graph-ts";
import {
  CommunityCreated,
  CommunityValiditySet,
  ProtocolFeeSet,
  Initialized,
  KeepersChanged,
  ProtopiansChanged,
  AuthorizedWalletSet,
  StreamingEscrowFactorySet,
  ProtopianDelegated
} from "../../generated/RegistryFactory/RegistryFactory";
// import {RegistryCommunity}from "../../generated/RegistryCommunity/RegistryCommunity";

export const CTX_FACTORY_ADDRESS = "factoryAddress";
export const CTX_CHAIN_ID = "chainId";

export function handleRegistryInitialized(event: Initialized): void {
  log.debug("RegistryFactory: handleRegistryInitialized: {}", [
    event.address.toHexString()
  ]);
  const addr_id = event.address.toHexString();
  let factory = RegistryFactory.load(addr_id);
  if (factory == null) {
    factory = new RegistryFactory(addr_id);
  }
  const chainId = dataSource.context().getI32(CTX_CHAIN_ID);
  factory.chainId = BigInt.fromI32(chainId);
  factory.authorizedWallets = [];
  factory.save();
}

function getOrCreateFactory(eventAddress: Address): RegistryFactory {
  const addrId = eventAddress.toHexString();
  let factory = RegistryFactory.load(addrId);

  if (factory == null) {
    factory = new RegistryFactory(addrId);
    const chainId = dataSource.context().getI32(CTX_CHAIN_ID);
    factory.chainId = BigInt.fromI32(chainId);
    factory.authorizedWallets = [];
  } else if (factory.authorizedWallets == null) {
    // Backward compatibility for entities indexed before this field existed.
    factory.authorizedWallets = [];
  }

  return factory as RegistryFactory;
}

export function handleCommunityCreated(event: CommunityCreated): void {
  log.debug("RegistryFactory: handleCommunityCreated: {}", [
    event.address.toHexString()
  ]);
  const addr_id = event.address.toHexString();
  let context = new DataSourceContext();
  context.setString(CTX_FACTORY_ADDRESS, addr_id);
  const chainId = dataSource.context().getI32(CTX_CHAIN_ID);
  context.setI32(CTX_CHAIN_ID, chainId);
  CommunityTemplate.createWithContext(event.params._registryCommunity, context);
}

export function handleProtocolFeeSet(event: ProtocolFeeSet): void {
  log.debug("RegistryFactory: handleProtocolFeeSet: {}", [
    event.address.toHexString()
  ]);
  const addr_id = event.address.toHexString();
  let community = RegistryCommunity.load(event.params._community.toHexString());
  if (community == null) {
    log.error("RegistryFactory: Community not found", []);
    return;
  }
  community.protocolFee = event.params._newProtocolFee;
  community.save();
}

//event CommunityValiditySet
export function handleCommunityValiditySet(event: CommunityValiditySet): void {
  log.debug("RegistryFactory: handleCommunityValiditySet: {}", [
    event.address.toHexString()
  ]);
  let community = RegistryCommunity.load(event.params._community.toHexString());
  if (community == null) {
    log.error("RegistryFactory: Community not found", []);
    return;
  }
  community.isValid = event.params._isValid;
  community.save();
}

export function handleKeepersChanged(event: KeepersChanged): void {
  log.debug("RegistryFactory: handleKeepersChanged: {}", [
    event.address.toHexString()
  ]);

  // New keepers
  for (let i = 0; i < event.params._new.length; i++) {
    let memberAddress = event.params._new[i].toHexString();
    let member = Member.load(memberAddress);
    if (member == null) {
      member = new Member(memberAddress);
    }

    member.isKeeper = true;
    member.save();

    let keeper = Keeper.load(memberAddress);
    if (keeper == null) {
      keeper = new Keeper(memberAddress);
    }
    keeper.address = memberAddress;
    keeper.save();
  }

  // Old keepers
  for (let i = 0; i < event.params._removed.length; i++) {
    let memberAddress = event.params._removed[i].toHexString();
    let member = Member.load(memberAddress);
    if (member == null) {
      member = new Member(memberAddress);
    }

    member.isKeeper = false;
    member.save();

    store.remove("Keeper", memberAddress);
  }
}

export function handleProtopiansChanged(event: ProtopiansChanged): void {
  log.debug("RegistryFactory: handleProtopiansChanged: {}", [
    event.address.toHexString()
  ]);

  // New keepers
  for (let i = 0; i < event.params._new.length; i++) {
    let memberAddress = event.params._new[i].toHexString();
    let member = Member.load(memberAddress);
    if (member == null) {
      member = new Member(memberAddress);
    }

    member.isProtopian = true;
    member.save();

    let protopian = Protopian.load(memberAddress);
    if (protopian == null) {
      protopian = new Protopian(memberAddress);
    }
    protopian.address = memberAddress;
    protopian.save();
  }

  // Old keepers
  for (let i = 0; i < event.params._removed.length; i++) {
    let memberAddress = event.params._removed[i].toHexString();
    let member = Member.load(memberAddress);
    if (member == null) {
      member = new Member(memberAddress);
    }

    member.isProtopian = false;
    member.save();

    store.remove("Protopian", memberAddress);
  }
}

export function handleStreamingEscrowFactorySet(
  event: StreamingEscrowFactorySet
): void {
  const id = `${event.address.toHexString()}-streaming`;
  let streamInfo = StreamInfo.load(id);
  if (streamInfo == null) {
    streamInfo = new StreamInfo(id);
    streamInfo.contractAddress = event.address.toHexString();
    streamInfo.contractType = "RegistryFactory";
    streamInfo.strategy = null;
    streamInfo.superfluidToken = null;
    streamInfo.maxFlowRate = null;
    streamInfo.superfluidGDA = Address.zero().toHexString();
    streamInfo.streamLastFlowRate = null;
    streamInfo.createdAt = event.block.timestamp;
  }

  // Keep required fields initialized for backward compatibility
  // with entities created before these fields existed in schema.
  streamInfo.totalMemberUnits = BigInt.fromI32(0);
  streamInfo.proposalStreamIds = [];
  streamInfo.updatedAt = event.block.timestamp;
  streamInfo.save();
}

export function handleAuthorizedWalletSet(
  event: AuthorizedWalletSet
): void {
  const factory = getOrCreateFactory(event.address);

  let allowlist = factory.authorizedWallets;
  const wallet = event.params.wallet.toHexString();

  let index = -1;
  for (let i = 0; i < allowlist.length; i++) {
    if (allowlist[i] == wallet) {
      index = i;
      break;
    }
  }

  if (event.params.authorized) {
    if (index == -1) {
      allowlist.push(wallet);
    }
  } else if (index >= 0) {
    const nextAllowlist = new Array<string>();
    for (let i = 0; i < allowlist.length; i++) {
      if (allowlist[i] != wallet) {
        nextAllowlist.push(allowlist[i]);
      }
    }
    allowlist = nextAllowlist;
  }

  factory.authorizedWallets = allowlist;
  factory.save();
}

export function handleProtopianDelegated(event: ProtopianDelegated): void {
  const from = event.params.from.toHexString();
  const to = event.params.to.toHexString();

  let delegationIndex = ProtopianDelegationIndex.load(from);
  if (delegationIndex == null) {
    delegationIndex = new ProtopianDelegationIndex(from);
  }

  const previousCommunityId = delegationIndex.community;
  if (previousCommunityId != null) {
    let previousCommunity = RegistryCommunity.load(previousCommunityId as string);
    if (previousCommunity != null) {
      previousCommunity.protopianDelegatedFrom = null;
      previousCommunity.save();
    }
  }

  if (to == Address.zero().toHexString()) {
    delegationIndex.community = null;
    delegationIndex.save();
    return;
  }

  let nextCommunity = RegistryCommunity.load(to);
  if (nextCommunity != null) {
    nextCommunity.protopianDelegatedFrom = from;
    nextCommunity.save();
    delegationIndex.community = to;
    delegationIndex.save();
    return;
  }

  delegationIndex.community = null;
  delegationIndex.save();
}
