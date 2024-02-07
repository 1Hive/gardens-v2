import { RegistryCommunity as CommunityTemplate } from "../../generated/templates";
import { RegistryFactory, RegistryCommunity } from "../../generated/schema";

import {
  BigInt,
  DataSourceContext,
  dataSource,
  log,
} from "@graphprotocol/graph-ts";
import { CommunityCreated } from "../../generated/RegistryFactory/RegistryFactory";
// import {RegistryCommunity}from "../../generated/RegistryCommunity/RegistryCommunity";

export const CTX_FACTORY_ADDRESS = "factoryAddress";
export const CTX_CHAIN_ID = "chainId";

export function handleCommunityCreated(event: CommunityCreated): void {
  log.debug("RegistryFactory: handleCommunityCreated: {}", [
    event.address.toHexString(),
  ]);
  const addr_id = event.address.toHexString();
  let factory = RegistryFactory.load(addr_id);
  if (factory == null) {
    factory = new RegistryFactory(addr_id);
  }
  let context = new DataSourceContext();
  context.setString(CTX_FACTORY_ADDRESS, addr_id);
  const chainId = dataSource.context().getI32(CTX_CHAIN_ID);

  factory.chainId = BigInt.fromI32(chainId);

  context.setI32(CTX_CHAIN_ID, chainId);
  CommunityTemplate.createWithContext(event.params._registryCommunity, context);
  factory.save();
}
