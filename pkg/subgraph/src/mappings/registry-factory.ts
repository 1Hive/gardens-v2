import { RegistryCommunityV0_0 as CommunityTemplate } from "../../generated/templates";
import { RegistryFactory, RegistryCommunity } from "../../generated/schema";

import {
  BigInt,
  DataSourceContext,
  dataSource,
  log
} from "@graphprotocol/graph-ts";
import {
  CommunityCreated,
  CommunityValiditySet,
  ProtocolFeeSet,
  Initialized
} from "../../generated/RegistryFactoryV0_0/RegistryFactoryV0_0";
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
  factory.save();
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
