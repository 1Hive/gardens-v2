import {
  CVStrategy as CVStrategyTemplate,
  PoolMetadata as PoolMetadataTemplate,
  Covenant as CovenantTemplate
} from "../../generated/templates";
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

import { BigInt, dataSource, log } from "@graphprotocol/graph-ts";
import {
  RegistryInitialized,
  RegistryCommunity as RegistryCommunityContract,
  MemberRegistered,
  MemberActivatedStrategy,
  StrategyAdded,
  StrategyRemoved,
  StakeAndRegisterMemberCall,
  MemberDeactivatedStrategy,
  PoolCreated,
  MemberKicked,
  MemberPowerIncreased,
  MemberRegisteredWithCovenant,
  MemberPowerDecreased,
  CommunityNameUpdated,
  BasisStakedAmountUpdated,
  CommunityFeeUpdated,
  CouncilSafeChangeStarted,
  CouncilSafeUpdated,
  CovenantIpfsHashUpdated,
  FeeReceiverChanged,
  KickEnabledUpdated,
  PoolRejected,
  CommunityArchived
} from "../../generated/templates/RegistryCommunity/RegistryCommunity";

import { RegistryFactory as RegistryFactoryContract } from "../../generated/RegistryFactory/RegistryFactory";

import { CVStrategy as CVStrategyContract } from "../../generated/templates/CVStrategy/CVStrategy";

import { ERC20 as ERC20Contract } from "../../generated/templates/RegistryCommunity/ERC20";
import { CTX_CHAIN_ID, CTX_FACTORY_ADDRESS } from "./registry-factory";

const TOKEN_NATIVE = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
const D = BigInt.fromI32(10000000);

function getMaxConviction(staked: BigInt, _decay: BigInt): BigInt {
  return staked.times(D).div(D.minus(_decay));
}

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

    const covenantIpfsHash = rcc.covenantIpfsHash();
    newRC.covenantIpfsHash = covenantIpfsHash;
    if (covenantIpfsHash.length > 0) {
      CovenantTemplate.create(covenantIpfsHash);
      newRC.covenant = covenantIpfsHash;
    } else {
      newRC.covenant = null;
    }
    newRC.registerStakeAmount = rcc.registerStakeAmount();
    newRC.councilSafe = rcc.councilSafe().toHexString();

    newRC.alloAddress = rcc.allo().toHexString();
    newRC.isKickEnabled = rcc.isKickEnabled();
    newRC.communityFee = rcc.communityFee();
    const protocolFeeResult = rfc.try_getProtocolFee(event.address);
    if (protocolFeeResult.reverted) {
      log.error(
        "RegistryCommunity: handleInitialized: protocolFee reverted for community: {}",
        [event.address.toHexString()]
      );
      newRC.protocolFee = BigInt.fromI32(0);
    } else {
      newRC.protocolFee = protocolFeeResult.value;
    }
    const token = rcc.gardenToken();
    newRC.registerToken = token.toHexString();
    newRC.registryFactory = factoryAddress;
    newRC.strategyTemplate = rcc.strategyTemplate().toHexString();
    newRC.isValid = true;

    const erc20 = ERC20Contract.bind(token);
    let tg = TokenGarden.load(token.toHexString());
    if (tg == null) {
      tg = new TokenGarden(token.toHexString());
      tg.name = erc20.name();
      tg.chainId = newRC.chainId;
      tg.decimals = BigInt.fromI32(erc20.decimals());
      tg.address = token.toHexString();
      tg.symbol = erc20.symbol();
    }
    tg.totalBalance = erc20.balanceOf(event.address);
    tg.ipfsCovenant = covenantIpfsHash.length > 0 ? covenantIpfsHash : null;
    tg.save();
    newRC.garden = tg.id;
    newRC.archived = false;
    newRC.membersCount = BigInt.fromI32(0);

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

  // handle community members count
  let communityEntity = RegistryCommunity.load(community);
  if (communityEntity == null) {
    log.error("RegistryCommunity: Community not found: {}", [community]);
    return;
  }
  communityEntity.membersCount = communityEntity.membersCount.plus(
    BigInt.fromI32(1)
  );
  communityEntity.save();
}

export function handleMemberRegistered(event: MemberRegistered): void {
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
  newMemberCommunity.save();

  // handle community members count
  let communityEntity = RegistryCommunity.load(community);
  if (communityEntity == null) {
    log.error("RegistryCommunity: Community not found: {}", [community]);
    return;
  }

  communityEntity.membersCount = communityEntity.membersCount.plus(
    BigInt.fromI32(1)
  );
  communityEntity.save();
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

  // handle community members count
  let communityEntity = RegistryCommunity.load(event.address.toHexString());
  if (communityEntity == null) {
    log.error("RegistryCommunity: Community not found: {}", [
      event.address.toHexString()
    ]);
    return;
  }

  communityEntity.membersCount = communityEntity.membersCount.minus(
    BigInt.fromI32(1)
  );
  communityEntity.save();
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

  // handle community members count
  let communityEntity = RegistryCommunity.load(event.address.toHexString());
  if (communityEntity == null) {
    log.error("RegistryCommunity: Community not found: {}", [
      event.address.toHexString()
    ]);
    return;
  }

  communityEntity.membersCount = communityEntity.membersCount.minus(
    BigInt.fromI32(1)
  );
  communityEntity.save();
}

// handleStrategyAdded
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
  cvs.archived = false;
  cvs.save();
}

// handleStrategyRemoved
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
  const totalEffectiveActivePoints = cvc.totalPointsActivated();
  strategy.totalEffectiveActivePoints = totalEffectiveActivePoints;
  const maxCVSupply = getMaxConviction(
    totalEffectiveActivePoints,
    cvc.cvParams().getDecay()
  );
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
  const totalEffectiveActivePoints = cvc.totalPointsActivated();
  strategy.totalEffectiveActivePoints = totalEffectiveActivePoints;
  const maxCVSupply = getMaxConviction(
    totalEffectiveActivePoints,
    cvc.cvParams().getDecay()
  );
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
  const metadataPointer = event.params._metadata.pointer;

  if (metadataPointer.length > 0) {
    PoolMetadataTemplate.create(metadataPointer);

    const strategyId = strategyAddress.toHexString();
    let strategy = CVStrategy.load(strategyId);
    if (strategy != null) {
      strategy.metadataHash = metadataPointer;
      strategy.metadata = metadataPointer;
      strategy.save();
    }
  }

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

  const covenantIpfsHash = event.params._covenantIpfsHash;
  community.covenantIpfsHash = covenantIpfsHash;
  if (covenantIpfsHash.length > 0) {
    CovenantTemplate.create(covenantIpfsHash);
    community.covenant = covenantIpfsHash;
  } else {
    community.covenant = null;
  }

  if (community.garden) {
    let tokenGarden = TokenGarden.load(community.garden);
    if (tokenGarden != null) {
      tokenGarden.ipfsCovenant =
        covenantIpfsHash.length > 0 ? covenantIpfsHash : null;
      tokenGarden.save();
    }
  }

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

export function handlePoolRejected(event: PoolRejected): void {
  log.debug("RegistryCommunity: handlePoolRejected: strategy:{}", [
    event.params._strategy.toHexString()
  ]);

  const strategyAddress = event.params._strategy;
  const strategy = CVStrategy.load(strategyAddress.toHexString());
  if (strategy == null) {
    log.error("RegistryCommunity: Strategy not found: {}", [
      strategyAddress.toHexString()
    ]);
    return;
  }
  strategy.archived = true;
  strategy.save();
}

export function handleCommunityArchived(event: CommunityArchived): void {
  log.debug("RegistryCommunity: handleCommunityArchived: {}", [
    event.address.toHexString()
  ]);

  const community = RegistryCommunity.load(event.address.toHexString());
  if (community == null) {
    log.error("RegistryCommunity: Community not found: {}", [
      event.address.toHexString()
    ]);
    return;
  }

  community.archived = event.params._archived;
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
