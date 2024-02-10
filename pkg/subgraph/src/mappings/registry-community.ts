import { CVStrategy as CVStrategyTemplate } from "../../generated/templates";
import {
  Member,
  RegistryCommunity,
  TokenGarden,
  MemberCommunity,
  Allo,
  CVStrategy,
} from "../../generated/schema";

import { BigInt, dataSource, log } from "@graphprotocol/graph-ts";
import {
  RegistryInitialized,
  RegistryCommunity as RegistryCommunityContract,
  MemberRegistered,
  MemberActivatedStrategy,
  StrategyAdded,
  StakeAndRegisterMemberCall,
  MemberDeactivatedStrategy,
} from "../../generated/templates/RegistryCommunity/RegistryCommunity";

import { ERC20 as ERC20Contract } from "../../generated/templates/RegistryCommunity/ERC20";
import { CTX_CHAIN_ID, CTX_FACTORY_ADDRESS } from "./registry-factory";

const TOKEN_NATIVE = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";

export function handleInitialized(event: RegistryInitialized): void {
  const communityAddr = event.address.toHexString();
  log.debug("RegistryCommunity: handleInitialized/* : {}", [communityAddr]);
  const rc = RegistryCommunity.load(communityAddr);
  const ctx = dataSource.context();
  if (ctx != null && rc == null) {
    const factoryAddress = ctx.getString(CTX_FACTORY_ADDRESS) as string | null;
    log.debug("factoryAddress: {}", [factoryAddress ? factoryAddress : "0x"]);
    let newRC = new RegistryCommunity(event.address.toHex());

    newRC.chainId = BigInt.fromI32(dataSource.context().getI32(CTX_CHAIN_ID));

    newRC.communityName = event.params._communityName;
    newRC.profileId = event.params._profileId.toHexString();
    // newRC.covenantIpfsHash = event.params._metadata.pointer;

    const rcc = RegistryCommunityContract.bind(event.address);

    newRC.covenantIpfsHash = rcc.covenantIpfsHash();
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

    const alloId = rcc.allo();
    let allo = Allo.load(alloId.toHexString());
    if (allo == null) {
      allo = new Allo(alloId.toHexString());
      allo.chainId = newRC.chainId;
      allo.tokenNative = TOKEN_NATIVE;
      allo.save();
    }
  }
}

// // handleMemberRegistered
export function handleMemberRegistered(event: MemberRegistered): void {
  const community = event.address.toHex();
  const memberAddress = event.params._member.toHexString();
  const id = `${memberAddress}-${community}`;
  log.debug("handleMemberRegistered: {}", [memberAddress]);

  let member = Member.load(memberAddress);

  if (member == null) {
    member = new Member(memberAddress);
    // member.memberAddress = memberAddress;
  }
  log.debug("totalStakedAmount: ", [
    member.totalStakedAmount ? member.totalStakedAmount!.toString() : "",
  ]);
  member.totalStakedAmount = member.totalStakedAmount
    ? member.totalStakedAmount!.plus(event.params._amountStaked)
    : event.params._amountStaked;

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

  let newMember = MemberCommunity.load(id);

  if (newMember == null) {
    newMember = new MemberCommunity(id);
    newMember.member = memberAddress;
    newMember.registryCommunity = community;
    newMember.memberAddress = memberAddress;
  }
  newMember.stakedAmount = event.params._amountStaked;
  newMember.isRegistered = true;
  newMember.save();
}

//handleMemberUnregistered
export function handleMemberUnregistered(event: MemberRegistered): void {
  log.debug("handleMemberUnregistered: {}", [
    event.params._member.toHexString(),
  ]);

  const memberAddress = event.params._member.toHexString();
  const id = `${memberAddress}-${event.address.toHexString()}`;
  const member = Member.load(memberAddress);
  if (member == null) {
    log.error("Member not found: {}", [memberAddress]);
    return;
  }

  const memberCommunity = MemberCommunity.load(id);
  if (memberCommunity == null) {
    log.error("MemberCommunity not found: {}", [id]);
    return;
  }
  memberCommunity.isRegistered = false;
  memberCommunity.stakedAmount = BigInt.fromI32(0);
  memberCommunity.save();

  member.totalStakedAmount = member.totalStakedAmount
    ? member.totalStakedAmount!.minus(event.params._amountStaked)
    : event.params._amountStaked;

  member.save();
}

// //  handleStrategyAdded
export function handleStrategyAdded(event: StrategyAdded): void {
  log.debug("handleStrategyAdded", [event.params._strategy.toHexString()]);
  const strategyAddress = event.params._strategy;

  CVStrategyTemplate.create(strategyAddress);
}

// handleCallStake
export function handleCallStake(call: StakeAndRegisterMemberCall): void {
  const memberAddr = call.from.toHexString();
  log.debug("handleCallStake: from:{}", [memberAddr]);
}

// handleMemberActivatedStrategy
export function handleMemberActivatedStrategy(
  event: MemberActivatedStrategy,
): void {
  log.debug("handleMemberActivatedStrategy: member:{}", [
    event.params._member.toHexString(),
  ]);

  const memberAddress = event.params._member;
  const strategyAddress = event.params._strategy;

  const strategy = CVStrategy.load(strategyAddress.toHexString());

  const member = Member.load(memberAddress.toHexString());

  if (member == null) {
    log.error("Member not found: {}", [memberAddress.toHexString()]);
    return;
  }

  if (!strategy) {
    log.error("Strategy not found: {}", [strategyAddress.toHexString()]);
    return;
  }
  let membersActive: string[] = [];
  if (strategy.memberActive) {
    membersActive = strategy.memberActive!;
  }
  membersActive.push(memberAddress.toHexString());
  strategy.memberActive = membersActive;
  strategy.save();
}

// handleMemberDeactivatedStrategy

export function handleMemberDeactivatedStrategy(
  event: MemberDeactivatedStrategy,
): void {
  log.debug("handleMemberDeactivatedStrategy: member:{}", [
    event.params._member.toHexString(),
  ]);

  const memberAddress = event.params._member;
  const strategyAddress = event.params._strategy;

  const strategy = CVStrategy.load(strategyAddress.toHexString());

  const member = Member.load(memberAddress.toHexString());

  if (member == null) {
    log.error("Member not found: {}", [memberAddress.toHexString()]);
    return;
  }

  if (!strategy) {
    log.error("Strategy not found: {}", [strategyAddress.toHexString()]);
    return;
  }

  let membersActive: string[] = [];
  if (strategy.memberActive) {
    membersActive = strategy.memberActive!;
  }
  const index = membersActive.indexOf(memberAddress.toHexString());
  if (index > -1) {
    membersActive.splice(index, 1);
  }
  strategy.memberActive = membersActive;
  strategy.save();
}
