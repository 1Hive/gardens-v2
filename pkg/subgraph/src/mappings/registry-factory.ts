// import {RegistryCommunity as CommunityTemplate } from "../../generated/templates";
import {RegistryFactory,RegistryCommunity } from "../../generated/schema";

import { DataSourceContext, log } from '@graphprotocol/graph-ts'
import {CommunityCreated}from "../../generated/RegistryFactory/RegistryFactory";
// import {RegistryCommunity}from "../../generated/RegistryCommunity/RegistryCommunity";

export const CTX_FACTORY_ADDRESS = 'factoryAddress';

export function handleCommunityCreated(event: CommunityCreated): void {
  log.debug("RegistryFactory: handleCommunityCreated: {}", [event.address.toHexString()]);
  let factory = new RegistryFactory(event.address.toHexString());
  
  let context = new DataSourceContext();
  context.setString(CTX_FACTORY_ADDRESS, event.address.toHexString());
  // CommunityTemplate.createWithContext(event.params._registryCommunity,context);
  factory.save();
}