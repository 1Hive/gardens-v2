import { CVStrategy as CVStrategyTemplate } from "../../generated/templates";
import { Member, RegistryCommunity, TokenGarden } from "../../generated/schema";

import { BigInt, dataSource, log } from "@graphprotocol/graph-ts";
import {
  RegistryInitialized,
  RegistryCommunity as RegistryCommunityContract,
  MemberRegistered,
  StrategyAdded,
} from "../../generated/templates/RegistryCommunity/RegistryCommunity";

import { ERC20 as ERC20Contract } from "../../generated/templates/RegistryCommunity/ERC20";
import { CTX_CHAIN_ID, CTX_FACTORY_ADDRESS } from "./registry-factory";

export function handleInitialized(event: RegistryInitialized): void {
  log.debug("RegistryCommunity: handleInitialized1", []);
  const communityAddr = event.address.toHexString();
  log.debug("RegistryCommunity: handleInitialized/* : {}", [communityAddr]);
  const rc = RegistryCommunity.load(communityAddr);
  const ctx = dataSource.context();
  log.debug("ctx1", []);
  if (ctx != null && rc == null) {
    const factoryAddress = ctx.getString(CTX_FACTORY_ADDRESS) as string | null;
    log.debug("factoryAddress: {}", [factoryAddress ? factoryAddress : "0x"]);
    let newRC = new RegistryCommunity(event.address.toHex());

    newRC.chainId = BigInt.fromI32(dataSource.context().getI32(CTX_CHAIN_ID));

    newRC.communityName = event.params._communityName;
    newRC.profileId = event.params._profileId.toHexString();
    newRC.covenantIpfsHash = event.params._metadata.pointer;

    const rcc = RegistryCommunityContract.bind(event.address);

    newRC.registerStakeAmount = rcc.registerStakeAmount();
    newRC.councilSafe = rcc.councilSafe().toHexString();

    newRC.alloAddress = rcc.allo().toHexString();
    newRC.isKickEnabled = rcc.isKickEnabled();
    newRC.protocolFee = rcc.communityFee();
    const token = rcc.gardenToken();
    newRC.registerToken = token.toHexString();
    newRC.registryFactory = factoryAddress;

    let tg = TokenGarden.load(token.toHexString());
    if (tg == null) {
      tg = new TokenGarden(token.toHexString());
      const erc20 = ERC20Contract.bind(token);

      tg.name = erc20.name();
      tg.totalBalance = erc20.balanceOf(event.address);
      tg.chainId = newRC.chainId;
      tg.decimals = BigInt.fromI32(erc20.decimals());
      tg.address = token.toHexString();
      tg.symbol = erc20.symbol();
      tg.save();
    }
    newRC.garden = tg.id;

    newRC.save();
  }
}

// // handleMemberRegistered
export function handleMemberRegistered(event: MemberRegistered): void {
  const communityAddr = event.address.toHexString();
  const rc = RegistryCommunity.load(communityAddr);
  const memberLen = rc
    ? rc.members.entries.length
      ? rc.members.entries.length
      : 0
    : 0;
  log.debug("handleMemberRegistered: memberLen: {}", [memberLen.toString()]);
  const memberAddress = event.params._member.toHexString();
  log.debug("handleMemberRegistered: {}", [memberAddress]);
  const community = event.address.toHex();
  // const id = `${memberAddress}-${community}`;
  let member = Member.load(memberAddress);
  // const memberC = MembersCommunity.load(id);
  if (member == null) {
    member = new Member(memberAddress);
    member.memberAddress = memberAddress;
  }
  let communities = member.registryCommunity;
  if (communities == null) {
    communities = [];
  }
  communities.push(community);
  log.debug("handleMemberRegistered: communities: {}", [
    communities.length.toString(),
  ]);
  member.registryCommunity = communities;
  member.isRegistered = true;
  member.stakedAmount = event.params._amountStaked;
  member.save();

  const rcc = RegistryCommunityContract.bind(event.address);

  const token = rcc.gardenToken();
  let tg = TokenGarden.load(token.toHexString());
  if (tg == null) {
    log.error("TokenGarden not found", []);
    return;
  }
  const erc20 = ERC20Contract.bind(token);

  tg.totalBalance = erc20.balanceOf(event.address);
  tg.save();
}

// //  handleStrategyAdded
export function handleStrategyAdded(event: StrategyAdded): void {
  log.debug("handleStrategyAdded", [event.params._strategy.toHexString()]);
  const strategyAddress = event.params._strategy;

  CVStrategyTemplate.create(strategyAddress);
}
