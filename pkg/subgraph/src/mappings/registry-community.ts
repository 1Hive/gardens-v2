import { CVStrategy as CVStrategyTemplate } from "../../generated/templates";
import {
  Member,
  RegistryCommunity,
  TokenGarden,
  MemberCommunity,
  Allo,
  CVStrategy,
  CVStrategyConfig,
  MemberStrategy,
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
  PoolCreated,
  MemberKicked,
  MemberPowerIncreased,
  MemberPowerDecreased,
} from "../../generated/templates/RegistryCommunity/RegistryCommunity";

import { RegistryFactory as RegistryFactoryContract } from "../../generated/RegistryFactory/RegistryFactory";

import { CVStrategy as CVStrategyContract } from "../../generated/templates/CVStrategy/CVStrategy";

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

    const rfc = RegistryFactoryContract.bind(rcc.registryFactory());

    newRC.covenantIpfsHash = rcc.covenantIpfsHash();
    newRC.registerStakeAmount = rcc.registerStakeAmount();
    newRC.councilSafe = rcc.councilSafe().toHexString();

    newRC.alloAddress = rcc.allo().toHexString();
    newRC.isKickEnabled = rcc.isKickEnabled();
    newRC.communityFee = rcc.communityFee();
    newRC.protocolFee = rfc.getProtocolFee(event.address);
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
  const memberCommunityId = `${memberAddress}-${community}`;
  log.debug("handleMemberRegistered: {}", [memberAddress]);

  let member = Member.load(memberAddress);

  if (member == null) {
    member = new Member(memberAddress);
  }

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

  let newMemberCommunity = MemberCommunity.load(memberCommunityId);

  if (newMemberCommunity == null) {
    newMemberCommunity = new MemberCommunity(memberCommunityId);
    newMemberCommunity.member = memberAddress;
    newMemberCommunity.registryCommunity = community;
    newMemberCommunity.memberAddress = memberAddress;
  }

  newMemberCommunity.stakedTokens = newMemberCommunity.stakedTokens
    ? newMemberCommunity.stakedTokens!.plus(event.params._amountStaked)
    : event.params._amountStaked;

  newMemberCommunity.isRegistered = true;
  newMemberCommunity.save();
}

//handleMemberUnregistered
export function handleMemberUnregistered(event: MemberRegistered): void {
  log.debug("handleMemberUnregistered: {}", [
    event.params._member.toHexString(),
  ]);

  const memberAddress = event.params._member.toHexString();
  const id = `${memberAddress}-${event.address.toHexString()}`;

  const memberCommunity = MemberCommunity.load(id);
  if (memberCommunity == null) {
    log.error("MemberCommunity not found: {}", [id]);
    return;
  }
  memberCommunity.isRegistered = false;
  memberCommunity.stakedTokens = BigInt.fromI32(0);

  memberCommunity.save();
}

// handleMemberKicked
export function handleMemberKicked(event: MemberKicked): void {
  log.debug("handleMemberKicked: {}", [event.params._member.toHexString()]);
  const memberAddress = event.params._member.toHexString();
  const idMemberCommunity = `${memberAddress}-${event.address.toHexString()}`;
  const member = Member.load(memberAddress);
  if (member == null) {
    log.error("Member not found: {}", [memberAddress]);
    return;
  }

  const memberCommunity = MemberCommunity.load(idMemberCommunity);
  if (memberCommunity == null) {
    log.error("MemberCommunity not found: {}", [idMemberCommunity]);
    return;
  }
  memberCommunity.isRegistered = false;
  memberCommunity.stakedTokens = BigInt.fromI32(0);
  memberCommunity.save();
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
  const cvc = CVStrategyContract.bind(strategyAddress);
  const totalEffectiveActivePoints = cvc.totalEffectiveActivePoints();
  strategy.totalEffectiveActivePoints = totalEffectiveActivePoints;
  const maxCVSupply = cvc.getMaxConviction(totalEffectiveActivePoints);
  strategy.maxCVSupply = maxCVSupply;

  let membersActive: string[] = [];
  if (strategy.memberActive) {
    membersActive = strategy.memberActive!;
  }

  membersActive.push(memberAddress.toHexString());
  strategy.memberActive = membersActive;
  strategy.save();

  const strategyConfigId = strategy.config;
  const strategyConfig = CVStrategyConfig.load(strategyConfigId);

  if (strategyConfig !== null) {
    if (strategyConfig.pointSystem == BigInt.fromI32(0)) {
      const memberStrategyId = `${memberAddress.toHexString()}-${strategyAddress.toHexString()}`;
      let memberStrategy = new MemberStrategy(memberStrategyId);
      memberStrategy.member = memberAddress.toHexString();
      memberStrategy.strategy = strategyAddress.toHexString();
      memberStrategy.totalStakedPoints = BigInt.fromI32(0);
      memberStrategy.activatedPoints = event.params._pointsToIncrease;
      memberStrategy.save();
    }
  }
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
  const cvc = CVStrategyContract.bind(strategyAddress);
  const totalEffectiveActivePoints = cvc.totalEffectiveActivePoints();
  strategy.totalEffectiveActivePoints = totalEffectiveActivePoints;
  const maxCVSupply = cvc.getMaxConviction(totalEffectiveActivePoints);
  strategy.maxCVSupply = maxCVSupply;

  const memberStrategyId = `${memberAddress.toHexString()}-${strategyAddress.toHexString()}`;
  const memberStrategy = MemberStrategy.load(memberStrategyId);

  if (!memberStrategy) {
    log.error("memberStrategy not found: {}", [memberStrategyId]);
    return;
  }
  memberStrategy.activatedPoints = BigInt.fromI32(0);

  strategy.memberActive = membersActive;
  memberStrategy.save();
  strategy.save();
}

// handlePoolCreated
export function handlePoolCreated(event: PoolCreated): void {
  log.debug("handlePoolCreated: address:{} poolid: {}", [
    event.params._strategy.toHexString(),
    event.params._poolId.toHexString(),
  ]);

  const strategyAddress = event.params._strategy;
  // const poolId = event.params._poolId;
  // const community = event.params._community;

  CVStrategyTemplate.create(strategyAddress);
}

export function handleMemberPowerIncreased(event: MemberPowerIncreased): void {
  const community = event.address.toHex();
  const memberAddress = event.params._member.toHexString();
  const memberCommunityId = `${memberAddress}-${community}`;

  let newMemberCommunity = MemberCommunity.load(memberCommunityId);

  if (newMemberCommunity == null) {
    log.error("MemberCommunity not found: {}", [memberCommunityId]);
    return;
  }

  newMemberCommunity.stakedTokens = newMemberCommunity.stakedTokens
    ? newMemberCommunity.stakedTokens!.plus(event.params._stakedAmount)
    : event.params._stakedAmount;

  newMemberCommunity.save();
}

export function handleMemberPowerDecreased(event: MemberPowerDecreased): void {
  const community = event.address.toHex();
  const memberAddress = event.params._member.toHexString();
  const memberCommunityId = `${memberAddress}-${community}`;

  let newMemberCommunity = MemberCommunity.load(memberCommunityId);

  if (newMemberCommunity == null) {
    log.error("MemberCommunity not found: {}", [memberCommunityId]);
    return;
  }

  newMemberCommunity.stakedTokens = newMemberCommunity.stakedTokens
    ? newMemberCommunity.stakedTokens!.minus(event.params._unstakedAmount)
    : event.params._unstakedAmount;

  newMemberCommunity.save();
}

// handler: handleMemberPowerDecreased
// export function handleMemberPowerDecreased(event: MemberPowerDecreased): void {
//   log.debug("handleMemberPowerDecreased: member:{} power:{} strategy:{} ", [
//     event.params._member.toHexString(),
//     event.params._power.toString(),
//     event.params._strategy.toHexString(),
//   ]);

//   const memberAddress = event.params._member;
//   const strategyAddress = event.params._strategy;

//   const strategy = CVStrategy.load(strategyAddress.toHexString());

//   const member = Member.load(memberAddress.toHexString());

//   if (member == null) {
//     log.error("Member not found: {}", [memberAddress.toHexString()]);
//     return;
//   }

//   if (!strategy) {
//     log.error("Strategy not found: {}", [strategyAddress.toHexString()]);
//     return;
//   }

//   let membersPower: string[] = [];
//   if (strategy.memberPower) {
//     membersPower = strategy.memberPower!;
//   }
//   const index = membersPower.indexOf(memberAddress.toHexString());
//   if (index > -1) {
//     membersPower.splice(index, 1);
//   }
//   strategy.memberPower = membersPower;
//   strategy.save();
// }
// handler: handleMemberPowerIncreased
// handler: handleBasisStakedAmountSet
