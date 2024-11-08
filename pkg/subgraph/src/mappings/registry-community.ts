import { CVStrategyV0_0 as CVStrategyTemplate } from "../../generated/templates";
import {
  Member,
  RegistryCommunity,
  TokenGarden,
  MemberCommunity,
  Allo,
  CVStrategy,
  CVStrategyConfig,
  MemberStrategy
} from "../../generated/schema";

import { BigInt, dataSource, ethereum, log } from "@graphprotocol/graph-ts";
import {
  RegistryInitialized,
  RegistryCommunityV0_0 as RegistryCommunityContract,
  MemberRegistered,
  MemberActivatedStrategy,
  StrategyAdded,
  StrategyRemoved,
  StakeAndRegisterMemberCall,
  MemberDeactivatedStrategy,
  PoolCreated,
  MemberKicked,
  MemberPowerIncreased,
  MemberPowerDecreased,
  CommunityNameUpdated,
  CovenantIpfsHashUpdated,
  KickEnabledUpdated,
  CouncilSafeChangeStarted,
  CouncilSafeUpdated,
  BasisStakedAmountUpdated,
  CommunityFeeUpdated,
  FeeReceiverChanged,
  MemberRegisteredWithCovenant
} from "../../generated/templates/RegistryCommunityV0_0/RegistryCommunityV0_0";

import { RegistryFactoryV0_0 as RegistryFactoryContract } from "../../generated/RegistryFactoryV0_0/RegistryFactoryV0_0";

import { CVStrategyV0_0 as CVStrategyContract } from "../../generated/templates/CVStrategyV0_0/CVStrategyV0_0";

import { ERC20 as ERC20Contract } from "../../generated/templates/RegistryCommunityV0_0/ERC20";
import { CTX_CHAIN_ID, CTX_FACTORY_ADDRESS } from "./registry-factory";

const TOKEN_NATIVE = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";

export function handleInitialized(event: RegistryInitialized): void {
  const communityAddr = event.address.toHexString();
  log.debug("RegistryCommunity: handleInitialized : {}", [communityAddr]);
  const rc = RegistryCommunity.load(communityAddr);
  const ctx = dataSource.context();
  if (ctx != null && rc == null) {
    const factoryAddress = ctx.getString(CTX_FACTORY_ADDRESS) as string | null;
    log.debug("RegistryCommunity: factoryAddress: {}", [
      factoryAddress ? factoryAddress : "0x"
    ]);
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
    newRC.strategyTemplate = rcc.strategyTemplate().toHexString();
    newRC.isValid = true;

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
export function handleMemberRegisteredWithCovenant(
  event: MemberRegisteredWithCovenant
): void {
  const community = event.address.toHex();
  const memberAddress = event.params._member.toHexString();
  const memberCommunityId = `${memberAddress}-${community}`;
  log.debug("RegistryCommunity: handleMemberRegistered: {}, {}", [
    community,
    memberAddress
  ]);

  let member = Member.load(memberAddress);

  if (member == null) {
    member = new Member(memberAddress);
  }

  member.save();

  const rcc = RegistryCommunityContract.bind(event.address);

  const token = rcc.gardenToken();
  let tg = TokenGarden.load(token.toHexString());
  if (tg == null) {
    log.error("RegistryCommunity: TokenGarden not found", []);
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
  newMemberCommunity.covenantSignature = event.params._covenantSig;
  newMemberCommunity.save();
}

export function handleMemberRegistered(event: MemberRegistered): void {
  // @ts-ignore
  const eventWithCovenant = changetype<MemberRegisteredWithCovenant>(
    event.params
  );
  handleMemberRegisteredWithCovenant(eventWithCovenant);
}

//handleMemberUnregistered
export function handleMemberUnregistered(event: MemberRegistered): void {
  log.debug("RegistryCommunity: handleMemberUnregistered: {}", [
    event.params._member.toHexString()
  ]);

  const memberAddress = event.params._member.toHexString();
  const id = `${memberAddress}-${event.address.toHexString()}`;

  const memberCommunity = MemberCommunity.load(id);
  if (memberCommunity == null) {
    log.error("RegistryCommunity: MemberCommunity not found: {}", [id]);
    return;
  }
  memberCommunity.isRegistered = false;
  memberCommunity.stakedTokens = BigInt.fromI32(0);

  memberCommunity.save();
}

// handleMemberKicked
export function handleMemberKicked(event: MemberKicked): void {
  log.debug("RegistryCommunity: handleMemberKicked: {}", [
    event.params._member.toHexString()
  ]);
  const memberAddress = event.params._member.toHexString();
  const idMemberCommunity = `${memberAddress}-${event.address.toHexString()}`;
  const member = Member.load(memberAddress);
  if (member == null) {
    log.error("Member not found: {}", [memberAddress]);
    return;
  }

  const memberCommunity = MemberCommunity.load(idMemberCommunity);
  if (memberCommunity == null) {
    log.error("RegistryCommunity: MemberCommunity not found: {}", [
      idMemberCommunity
    ]);
    return;
  }
  memberCommunity.isRegistered = false;
  memberCommunity.stakedTokens = BigInt.fromI32(0);
  memberCommunity.save();
}

// //  handleStrategyAdded
export function handleStrategyAdded(event: StrategyAdded): void {
  log.debug("RegistryCommunity: handleStrategyAdded", [
    event.params._strategy.toHexString()
  ]);
  const strategyAddress = event.params._strategy.toHexString();

  const cvs = CVStrategy.load(strategyAddress);

  if (cvs == null) {
    log.error("RegistryCommunity: CVStrategy not found: {}", [strategyAddress]);
    return;
  }

  cvs.isEnabled = true;
  cvs.save();
}

// //  handleStrategyAdded
export function handleStrategyRemoved(event: StrategyRemoved): void {
  log.debug("RegistryCommunity: handleStrategyRemoved", [
    event.params._strategy.toHexString()
  ]);
  const strategyAddress = event.params._strategy.toHexString();

  const cvs = CVStrategy.load(strategyAddress);

  if (cvs == null) {
    log.error("RegistryCommunity: CVStrategy not found: {}", [strategyAddress]);
    return;
  }

  cvs.isEnabled = false;
  cvs.save();
}

// handleCallStake
export function handleCallStake(call: StakeAndRegisterMemberCall): void {
  const memberAddr = call.from.toHexString();
  log.debug("RegistryCommunity: handleCallStake: from:{}", [memberAddr]);
}

// handleMemberActivatedStrategy
export function handleMemberActivatedStrategy(
  event: MemberActivatedStrategy
): void {
  log.debug("RegistryCommunity: handleMemberActivatedStrategy: member:{}", [
    event.params._member.toHexString()
  ]);

  const memberAddress = event.params._member;
  const strategyAddress = event.params._strategy;

  const strategy = CVStrategy.load(strategyAddress.toHexString());

  const member = Member.load(memberAddress.toHexString());

  if (member == null) {
    log.error("RegistryCommunity: Member not found: {}", [
      memberAddress.toHexString()
    ]);
    return;
  }

  if (!strategy) {
    log.error("RegistryCommunity: Strategy not found: {}", [
      strategyAddress.toHexString()
    ]);
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
  event: MemberDeactivatedStrategy
): void {
  log.debug("RegistryCommunity: handleMemberDeactivatedStrategy: member:{}", [
    event.params._member.toHexString()
  ]);

  const memberAddress = event.params._member;
  const strategyAddress = event.params._strategy;

  const strategy = CVStrategy.load(strategyAddress.toHexString());

  const member = Member.load(memberAddress.toHexString());

  if (member == null) {
    log.error("RegistryCommunity: RegistryCommunity: Member not found: {}", [
      memberAddress.toHexString()
    ]);
    return;
  }

  if (!strategy) {
    log.error("RegistryCommunity: Strategy not found: {}", [
      strategyAddress.toHexString()
    ]);
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
    log.error("RegistryCommunity: memberStrategy not found: {}", [
      memberStrategyId
    ]);
    return;
  }
  memberStrategy.activatedPoints = BigInt.fromI32(0);

  strategy.memberActive = membersActive;
  memberStrategy.save();
  strategy.save();
}

// handlePoolCreated
export function handlePoolCreated(event: PoolCreated): void {
  log.debug("RegistryCommunity: handlePoolCreated: address:{} poolid: {}", [
    event.params._strategy.toHexString(),
    event.params._poolId.toHexString()
  ]);

  const strategyAddress = event.params._strategy;

  CVStrategyTemplate.create(strategyAddress);
}

export function handleMemberPowerIncreased(event: MemberPowerIncreased): void {
  const community = event.address.toHex();
  const memberAddress = event.params._member.toHexString();
  const memberCommunityId = `${memberAddress}-${community}`;

  let newMemberCommunity = MemberCommunity.load(memberCommunityId);

  if (newMemberCommunity == null) {
    log.error("RegistryCommunity: MemberCommunity not found: {}", [
      memberCommunityId
    ]);
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
    log.error("RegistryCommunity: MemberCommunity not found: {}", [
      memberCommunityId
    ]);
    return;
  }

  newMemberCommunity.stakedTokens = newMemberCommunity.stakedTokens
    ? newMemberCommunity.stakedTokens!.minus(event.params._unstakedAmount)
    : event.params._unstakedAmount;

  newMemberCommunity.save();
}

/** Need to hanlde the following events:
 * - handleFeeReceiverChanged
 * - handleCommunityNameUpdated
 * handleCovenantIpfsHashUpdated
 * handleKickEnabledUpdated
 * handleCouncilSafeChangeStarted
 * handleCouncilSafeUpdated
 * handleBasisStakedAmountUpdated
 */

// export function handleFeeReceiverChanged(event: MemberPowerDecreased): void {
//   log.debug("RegistryCommunity: handleFeeReceiverChanged: {}", [
//     event.params._member.toHexString()
//   ]);

// }

export function handleCommunityNameUpdated(event: CommunityNameUpdated): void {
  log.debug("RegistryCommunity: handleCommunityNameUpdated: {}", [
    event.params._communityName
  ]);

  let community = RegistryCommunity.load(event.address.toHexString());
  if (community == null) {
    log.error("RegistryCommunity: Community not found: {}", [
      event.address.toHexString()
    ]);
    return;
  }

  community.communityName = event.params._communityName;
  community.save();
}

export function handleCovenantIpfsHashUpdated(
  event: CovenantIpfsHashUpdated
): void {
  log.debug("RegistryCommunity: handleCovenantIpfsHashUpdated: {}", [
    event.params._covenantIpfsHash
  ]);

  let community = RegistryCommunity.load(event.address.toHexString());
  if (community == null) {
    log.error("RegistryCommunity: Community not found: {}", [
      event.address.toHexString()
    ]);
    return;
  }

  community.covenantIpfsHash = event.params._covenantIpfsHash;
  community.save();
}

export function handleKickEnabledUpdated(event: KickEnabledUpdated): void {
  log.debug("RegistryCommunity: handleKickEnabledUpdated: {}", [
    event.params._isKickEnabled.toString()
  ]);

  let community = RegistryCommunity.load(event.address.toHexString());
  if (community == null) {
    log.error("RegistryCommunity: Community not found: {}", [
      event.address.toHexString()
    ]);
    return;
  }

  community.isKickEnabled = event.params._isKickEnabled;
  community.save();
}

export function handleCouncilSafeChangeStarted(
  event: CouncilSafeChangeStarted
): void {
  log.debug(
    "RegistryCommunity: handleCouncilSafeChangeStarted: from {} to {}",
    [
      event.params._safeOwner.toHexString(),
      event.params._newSafeOwner.toHexString()
    ]
  );

  let community = RegistryCommunity.load(event.address.toHexString());
  if (community == null) {
    log.error("RegistryCommunity: Community not found: {}", [
      event.address.toHexString()
    ]);
    return;
  }

  community.pendingNewCouncilSafe = event.params._newSafeOwner.toHexString();
  community.save();
}

export function handleCouncilSafeUpdated(event: CouncilSafeUpdated): void {
  log.debug("RegistryCommunity: handleCouncilSafeUpdated: {}", [
    event.params._safe.toHexString()
  ]);

  let community = RegistryCommunity.load(event.address.toHexString());
  if (community == null) {
    log.error("RegistryCommunity: Community not found: {}", [
      event.address.toHexString()
    ]);
    return;
  }

  community.councilSafe = event.params._safe.toHexString();
  community.pendingNewCouncilSafe = null;
  community.save();
}

export function handleBasisStakedAmountUpdated(
  event: BasisStakedAmountUpdated
): void {
  log.debug("RegistryCommunity: handleBasisStakedAmountUpdated: {}", [
    event.params._newAmount.toString()
  ]);

  let community = RegistryCommunity.load(event.address.toHexString());
  if (community == null) {
    log.error("RegistryCommunity: Community not found: {}", [
      event.address.toHexString()
    ]);
    return;
  }

  community.registerStakeAmount = event.params._newAmount;
  community.save();
}

export function handleCommunityFeeUpdated(event: CommunityFeeUpdated): void {
  log.debug("RegistryCommunity: handleCommunityFeeUpdated: {}", [
    event.params._newFee.toString()
  ]);

  let community = RegistryCommunity.load(event.address.toHexString());
  if (community == null) {
    log.error("RegistryCommunity: Community not found: {}", [
      event.address.toHexString()
    ]);
    return;
  }

  community.communityFee = event.params._newFee;
  community.save();
}

export function handleFeeReceiverChanged(event: FeeReceiverChanged): void {
  log.debug("RegistryCommunity: handleFeeReceiverChanged: {}", [
    event.params._feeReceiver.toHexString()
  ]);

  let community = RegistryCommunity.load(event.address.toHexString());
  if (community == null) {
    log.error("RegistryCommunity: Community not found: {}", [
      event.address.toHexString()
    ]);
    return;
  }

  if (event.params._feeReceiver) {
    community.protocolFeeReceiver = event.params._feeReceiver.toHexString();
  } else {
    community.protocolFeeReceiver = null;
  }
  community.save();
}

// handler: handleMemberPowerDecreased
// export function handleMemberPowerDecreased(event: MemberPowerDecreased): void {
//   log.debug("RegistryCommunity: handleMemberPowerDecreased: member:{} power:{} strategy:{} ", [
//     event.params._member.toHexString(),
//     event.params._power.toString(),
//     event.params._strategy.toHexString(),
//   ]);

//   const memberAddress = event.params._member;
//   const strategyAddress = event.params._strategy;

//   const strategy = CVStrategy.load(strategyAddress.toHexString());

//   const member = Member.load(memberAddress.toHexString());

//   if (member == null) {
//     log.error("RegistryCommunity: Member not found: {}", [memberAddress.toHexString()]);
//     return;
//   }

//   if (!strategy) {
//     log.error("RegistryCommunity: Strategy not found: {}", [strategyAddress.toHexString()]);
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
