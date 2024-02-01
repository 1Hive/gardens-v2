import {   RegistryFactory } from "../../generated/schema";

import { log } from '@graphprotocol/graph-ts'
import {CommunityCreated}from "../../generated/RegistryFactory/RegistryFactory";

export function handleCommunityCreated(event: CommunityCreated): void {
  log.debug("RegistryFactory: handleCommunityCreated: {}", [event.address.toHexString()]);
  let factory = new RegistryFactory(event.address.toHexString());
  factory.save();
}