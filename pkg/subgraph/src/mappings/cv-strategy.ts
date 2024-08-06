import {
  CVProposal,
  CVStrategy,
  CVStrategyConfig,
  MemberStrategy,
  Stake,
  Member,
  ProposalDispute,
  ProposalDisputeMetadata,
  // ProposalMeta as ProposalMetadata,
} from "../../generated/schema";
import { ProposalDisputeMetadata as ProposalDisputeMetadataTemplate } from "../../generated/templates";

import {
  Distributed,
  InitializedCV,
  ProposalCreated,
  CVStrategy as CVStrategyContract,
  PoolAmountIncreased,
  SupportAdded,
  PowerIncreased,
  PowerDecreased,
  PointsDeactivated,
  DecayUpdated,
  MaxRatioUpdated,
  MinThresholdPointsUpdated,
  WeightUpdated,
  ArbitrationConfigUpdated,
  Ruling,
  ProposalDisputed,
} from "../../generated/templates/CVStrategy/CVStrategy";

import { Allo as AlloContract } from "../../generated/templates/CVStrategy/Allo";

import { BigInt, log } from "@graphprotocol/graph-ts";

// export const CTX_PROPOSAL_ID = "proposalId";
// export const CTX_METADATA_ID = "metadataId";

export function handleInitialized(event: InitializedCV): void {
  log.debug("handleInitialized", []);
  const poolId = event.params.poolId;
  const registryCommunity = event.params.data.registryCommunity.toHexString();
  const decay = event.params.data.decay;
  const maxRatio = event.params.data.maxRatio;
  const minThresholdPoints = event.params.data.minThresholdPoints;
  const weight = event.params.data.weight;
  const pType = event.params.data.proposalType;
  const maxAmount = event.params.data.pointConfig.maxAmount;
  const pointSystem = event.params.data.pointSystem;

  log.debug(
    "handleInitialized registryCommunity:{} decay:{} maxRatio:{} minThresholdPoints:{} weight:{} pType:{} maxAmount:{}",
    [
      registryCommunity,
      decay.toString(),
      maxRatio.toString(),
      minThresholdPoints.toString(),
      weight.toString(),
      pType.toString(),
      maxAmount.toString(),
    ],
  );

  const cvc = CVStrategyContract.bind(event.address);

  let cvs = new CVStrategy(event.address.toHex());
  let alloAddr = cvc.getAllo();

  const allo = AlloContract.bind(alloAddr);

  let metadata = allo.getPool(poolId).metadata.pointer;
  if (metadata) {
    log.debug("metadata:{}", [metadata.toString()]);
    cvs.metadata = metadata ? metadata.toString() : null;
  }

  cvs.poolId = poolId;
  cvs.registryCommunity = registryCommunity;
  let config = new CVStrategyConfig(
    `${event.address.toHex()}-${poolId.toString()}-config`,
  );

  cvs.poolAmount = cvc.getPoolAmount();
  cvs.maxCVSupply = BigInt.fromI32(0);
  cvs.totalEffectiveActivePoints = cvc.totalEffectiveActivePoints();
  cvs.isEnabled = false;

  config.decay = decay;
  config.maxRatio = maxRatio;
  config.minThresholdPoints = minThresholdPoints;
  config.weight = weight;
  config.proposalType = BigInt.fromI32(pType);
  config.pointSystem = BigInt.fromI32(pointSystem);
  config.maxAmount = maxAmount;

  config.D = cvc.D();
  config.save();

  cvs.config = config.id;

  cvs.save();
}

export function handleProposalCreated(event: ProposalCreated): void {
  const cvsId = event.address.toHexString();
  const proposalIdString = `${cvsId}-${event.params.proposalId.toString()}`;

  const cvc = CVStrategyContract.bind(event.address);

  log.debug("handleProposalCreated proposalIdString:{} cvsId:{} ", [
    proposalIdString,
    cvsId,
  ]);

  let p = cvc.try_getProposal(event.params.proposalId);
  if (p.reverted) {
    log.error("handleProposalCreated proposal reverted:{}", [proposalIdString]);
    return;
  }
  let proposal = p.value;

  const proposalStakedAmount = cvc.getProposalStakedAmount(
    event.params.proposalId,
  );
  const maxConviction = cvc.getMaxConviction(proposalStakedAmount);

  let newProposal = new CVProposal(proposalIdString);
  newProposal.strategy = cvsId;
  newProposal.proposalNumber = event.params.proposalId;

  newProposal.beneficiary = proposal.getBeneficiary().toHex();
  let requestedToken = proposal.getRequestedToken();
  newProposal.requestedToken = requestedToken.toHex();

  newProposal.blockLast = proposal.getBlockLast();
  newProposal.convictionLast = proposal.getConvictionLast();
  newProposal.threshold = proposal.getThreshold();
  newProposal.stakedAmount = proposal.getStakedAmount();

  newProposal.requestedAmount = proposal.getRequestedAmount();
  newProposal.maxCVStaked = maxConviction;

  newProposal.proposalStatus = BigInt.fromI32(proposal.getProposalStatus());
  // newProposal.proposalType = BigInt.fromI32(proposal.proposalType());
  newProposal.submitter = proposal.getSubmitter().toHex();
  // newProposal.voterStakedPointsPct = proposal.getVoterStakedPointsPct();
  // newProposal.agreementActionId = proposal.getAgreementActionId();

  const pointer = cvc.getMetadata(event.params.proposalId).pointer;

  newProposal.metadata = pointer;
  // const metadataID = `${pointer}-${proposalIdString}`;
  const metadataID = `${pointer}`;
  // newProposal.proposalMeta = metadataID;
  log.debug("handleProposalCreated pointer:{}", [metadataID]);
  newProposal.createdAt = event.block.timestamp;
  newProposal.updatedAt = event.block.timestamp;

  // const ctx = dataSource.context();
  // ctx.setString(CTX_PROPOSAL_ID, proposalIdString);
  // ctx.setString(CTX_METADATA_ID, proposalIdString);
  // const pm = ProposalMetadata.load(pointer);
  // if (pm == null) {
  //   ProposalMetadataTemplate.createWithContext(pointer, ctx);
  // }

  newProposal.save();
}
// handlePoolAmountIncreased
export function handlePoolAmountIncreased(event: PoolAmountIncreased): void {
  log.debug("handlePoolAmountIncreased: amount: {}", [
    event.params.amount.toString(),
  ]);
  let cvs = CVStrategy.load(event.address.toHexString());
  if (cvs == null) {
    log.debug("handlePoolAmountIncreased cvs not found: {}", [
      event.address.toHexString(),
    ]);
    return;
  }

  cvs.poolAmount = cvs.poolAmount
    ? cvs.poolAmount.plus(event.params.amount)
    : event.params.amount;
  cvs.save();
}

export function handleSupportAdded(event: SupportAdded): void {
  log.debug("handleSupportAdded: amount: {}", [event.params.amount.toString()]);

  const proposalId = `${event.address.toHexString()}-${event.params.proposalId}`;

  let cvp = CVProposal.load(proposalId);
  if (cvp == null) {
    log.debug("handleSupportAdded cvp not found: {}", [proposalId.toString()]);
    return;
  }

  let cvs = CVStrategy.load(cvp.strategy);
  if (cvs == null) {
    log.debug("handleSupportAdded cvs not found: {}", [
      cvp.strategy.toString(),
    ]);
    return;
  }

  const memberStrategyId = `${event.params.from.toHexString()}-${cvs.id}`;
  let stakeId = `${cvp.id.toString()}-${memberStrategyId}`;

  let stake = Stake.load(stakeId);

  let memberStrategy = MemberStrategy.load(memberStrategyId);

  if (memberStrategy == null) {
    log.debug("handleSupportAdded memberStrategy not found: {}", [
      memberStrategyId.toString(),
    ]);
    return;
  }

  if (!stake) {
    stake = new Stake(stakeId);
    stake.member = event.params.from.toHexString();
    stake.proposal = cvp.id;
    stake.amount = BigInt.fromI32(0);
  }

  const previousStake = stake.amount;

  const delta = event.params.amount.minus(previousStake);

  memberStrategy.totalStakedPoints = memberStrategy.totalStakedPoints
    ? memberStrategy.totalStakedPoints.plus(delta)
    : event.params.amount;

  stake.poolId = cvs.poolId;
  stake.amount = event.params.amount;
  stake.createdAt = event.block.timestamp;
  stake.save();

  const cvc = CVStrategyContract.bind(event.address);
  const proposalStakedAmount = cvc.getProposalStakedAmount(
    event.params.proposalId,
  );
  const maxConviction = cvc.getMaxConviction(proposalStakedAmount);

  memberStrategy.save();
  cvp.maxCVStaked = maxConviction;

  cvp.stakedAmount = event.params.totalStakedAmount;
  cvp.convictionLast = event.params.convictionLast;
  cvp.save();
}

export function handlePointsDeactivated(event: PointsDeactivated): void {
  let member = Member.load(event.params.member.toHexString());

  if (member !== null) {
    const stakes = member.stakes.load();
    for (let i = 0; i < stakes.length; i++) {
      const proposal = CVProposal.load(stakes[i].proposal);
      if (proposal !== null) {
        const strategy = CVStrategy.load(proposal.strategy);
        if (strategy !== null) {
          if (strategy.id == event.address.toHexString()) {
            const stake = Stake.load(stakes[i].id);
            if (stake !== null) {
              const stakedAmount = stake.amount;
              stake.amount = BigInt.fromI32(0);
              stake.save();
              proposal.stakedAmount = proposal.stakedAmount.minus(stakedAmount);
              const cvc = CVStrategyContract.bind(event.address);

              let contractProposal = cvc.try_getProposal(
                proposal.proposalNumber,
              );
              if (contractProposal.reverted) {
                log.error(
                  "handlePointsDeactivated contractProposal reverted:{}",
                  [proposal.proposalNumber.toString()],
                );
                return;
              }
              let prop = contractProposal.value;
              const maxConviction = cvc.getMaxConviction(
                prop.value4, // proposalStakedAmount
              );
              proposal.maxCVStaked = maxConviction;
              proposal.convictionLast = prop.value7; // convictionLast

              proposal.save();
              const memberStrategyId = `${member.id}-${strategy.id}`;
              const memberStrategy = MemberStrategy.load(memberStrategyId);
              if (memberStrategy !== null) {
                memberStrategy.totalStakedPoints =
                  memberStrategy.totalStakedPoints.minus(stakedAmount);
                memberStrategy.save();
              } else {
                log.debug(
                  "handlePointsDeactivated memberStrategy not found: {}",
                  [memberStrategyId.toString()],
                );
              }
              log.debug("handlePointsDeactivated stake not found: {}", [
                stakes[i].id.toString(),
              ]);
            }
          } else {
            log.debug("handlePointsDeactivated strategy not found: {}", [
              proposal.strategy.toString(),
            ]);
          }
        } else {
          log.debug("handlePointsDeactivated proposal not found: {}", [
            stakes[i].proposal.toString(),
          ]);
        }
      }
    }
  } else {
    log.debug("handlePointsDeactivated member not found: {}", [
      event.params.member.toHexString(),
    ]);
  }
}

export function handleDistributed(event: Distributed): void {
  log.debug("handleDistributed: amount: {}", [event.params.amount.toString()]);

  const proposalId = `${event.address.toHexString()}-${event.params.proposalId}`;

  let cvp = CVProposal.load(proposalId);
  if (cvp == null) {
    log.debug("handleDistributed cvp not found: {}", [
      event.params.proposalId.toString(),
    ]);
    return;
  }

  let cvs = CVStrategy.load(cvp.strategy);
  if (cvs == null) {
    log.debug("handleDistributed cvs not found: {}", [cvp.strategy.toString()]);
    return;
  }

  const cvc = CVStrategyContract.bind(event.address);
  const proposalStatus = cvc
    .getProposal(event.params.proposalId)
    .getProposalStatus();

  cvp.proposalStatus = BigInt.fromI32(proposalStatus);
  cvp.save();

  cvs.poolAmount = cvc.getPoolAmount();
  cvs.save();
}

export function handlePowerIncreased(event: PowerIncreased): void {
  let cvs = CVStrategy.load(event.address.toHexString());
  if (cvs == null) {
    log.debug("handlePowerIncreased cvs not found: {}", [
      event.address.toHexString(),
    ]);
    return;
  }

  const cvc = CVStrategyContract.bind(event.address);
  const totalEffectiveActivePoints = cvc.totalEffectiveActivePoints();
  cvs.totalEffectiveActivePoints = totalEffectiveActivePoints;

  cvs.save();

  const memberStrategyId = `${event.params.member.toHexString()}-${cvs.id}`;

  let memberStrategy = MemberStrategy.load(memberStrategyId);
  if (memberStrategy == null) {
    memberStrategy = new MemberStrategy(memberStrategyId);
    memberStrategy.member = event.params.member.toHexString();
    memberStrategy.strategy = cvs.id;
    memberStrategy.totalStakedPoints = BigInt.fromI32(0);
  }

  memberStrategy.activatedPoints = memberStrategy.activatedPoints
    ? memberStrategy.activatedPoints!.plus(event.params.pointsToIncrease)
    : event.params.pointsToIncrease;

  memberStrategy.save();
}

export function handlePowerDecreased(event: PowerDecreased): void {
  let cvs = CVStrategy.load(event.address.toHexString());
  if (cvs == null) {
    log.debug("handlePowerDecreased cvs not found: {}", [
      event.address.toHexString(),
    ]);
    return;
  }

  const cvc = CVStrategyContract.bind(event.address);
  const totalEffectiveActivePoints = cvc.totalEffectiveActivePoints();
  cvs.totalEffectiveActivePoints = totalEffectiveActivePoints;

  cvs.save();

  const memberStrategyId = `${event.params.member.toHexString()}-${cvs.id}`;

  let memberStrategy = MemberStrategy.load(memberStrategyId);
  if (memberStrategy == null) {
    log.debug("handlePowerDecreased memberStrategy not found: {}", [
      memberStrategyId.toString(),
    ]);
    return;
  }

  memberStrategy.activatedPoints = memberStrategy.activatedPoints
    ? memberStrategy.activatedPoints!.minus(event.params.pointsToDecrease)
    : BigInt.fromI32(0);

  memberStrategy.save();
}

export function handleDecayUpdated(event: DecayUpdated): void {
  let cvs = CVStrategy.load(event.address.toHexString());
  if (cvs == null) {
    log.debug("handleDecayUpdated cvs not found: {}", [
      event.address.toHexString(),
    ]);
    return;
  }
  if (cvs.config) {
    let config = CVStrategyConfig.load(cvs.config);
    if (config == null) {
      log.debug("handleDecayUpdated config not found: {}", [
        event.address.toHexString(),
      ]);
      return;
    }
    config.decay = event.params.decay;
    config.save();
  }
  return;
}

export function handleMaxRatioUpdated(event: MaxRatioUpdated): void {
  let cvs = CVStrategy.load(event.address.toHexString());
  if (cvs == null) {
    log.debug("handleMaxRatioUpdated cvs not found: {}", [
      event.address.toHexString(),
    ]);
    return;
  }
  if (cvs.config) {
    let config = CVStrategyConfig.load(cvs.config);
    if (config == null) {
      log.debug("handleMaxRatioUpdated config not found: {}", [
        event.address.toHexString(),
      ]);
      return;
    }
    config.maxRatio = event.params.maxRatio;
    config.save();
  }
  return;
}

export function handleMinThresholdPointsUpdated(
  event: MinThresholdPointsUpdated,
): void {
  let cvs = CVStrategy.load(event.address.toHexString());
  if (cvs == null) {
    log.debug("handleMaxRatioUpdated cvs not found: {}", [
      event.address.toHexString(),
    ]);
    return;
  }
  if (cvs.config) {
    let config = CVStrategyConfig.load(cvs.config);
    if (config == null) {
      log.debug("handleMaxRatioUpdated config not found: {}", [
        event.address.toHexString(),
      ]);
      return;
    }
    config.minThresholdPoints = event.params.minThresholdPoints;
    config.save();
  }
  return;
}

export function handleWeightUpdated(event: WeightUpdated): void {
  let cvs = CVStrategy.load(event.address.toHexString());
  if (cvs == null) {
    log.debug("handleWeightUpdated cvs not found: {}", [
      event.address.toHexString(),
    ]);
    return;
  }
  if (cvs.config) {
    let config = CVStrategyConfig.load(cvs.config);
    if (config == null) {
      log.debug("handleWeightUpdated config not found: {}", [
        event.address.toHexString(),
      ]);
      return;
    }
    config.weight = event.params.weight;
    config.save();
  }
  return;
}

export function handleProposalDisputed(event: ProposalDisputed): void {
  let dispute = new ProposalDispute(
    event.params.arbitrator.toString() +
      "_" +
      event.params.disputeId.toString(),
  );
  dispute.disputeId = event.params.disputeId;
  dispute.challenger = event.params.challenger.toHexString();
  dispute.proposal = CVStrategy.load(event.address.toHexString())!.id;
  dispute.timestamp = event.block.timestamp;
  dispute.context = event.params.context;
  dispute.metadata = event.params.context;
  log.debug("Fetching proposal dispute metadata for {}: {}", [
    dispute.id,
    dispute.metadata,
  ]);
  ProposalDisputeMetadataTemplate.create(dispute.metadata);
  dispute.save();
}

export function handleArbitrationConfigUpdated(
  event: ArbitrationConfigUpdated,
): void {
  let cvs = CVStrategy.load(event.address.toHexString());
  if (cvs == null) {
    log.debug("handleArbitrationConfigUpdated cvs not found: {}", [
      event.address.toHexString(),
    ]);
    return;
  }
  if (cvs.config) {
    let config = CVStrategyConfig.load(cvs.config);
    if (config == null) {
      log.debug("handleArbitrationConfigUpdated config not found: {}", [
        event.address.toHexString(),
      ]);
      return;
    }
    config.arbitrator = event.params.arbitrableConfig.arbitrator.toHexString();
    config.tribunalSafe =
      event.params.arbitrableConfig.tribunalSafe.toHexString();
    config.challengerCollateralAmount = event.params.arbitrableConfig.challengerCollateralAmount;
    config.submitterCollateralAmount = event.params.arbitrableConfig.submitterCollateralAmount;
    config.defaultRuling = event.params.arbitrableConfig.defaultRuling;
    config.defaultRulingTimeout =
      event.params.arbitrableConfig.defaultRulingTimeout;
    config.save();
  }
  return;
}

export function handleDisputeRuled(event: Ruling): void {
  let dispute = ProposalDispute.load(
    event.params._arbitrator.toString() +
      "_" +
      event.params._disputeID.toString(),
  );

  if (dispute == null) {
    log.error("Dispute not found with: {}_{}", [
      event.params._arbitrator.toString(),
      event.params._disputeID.toString(),
    ]);
    return;
  }

  dispute.status = event.params._ruling;
  dispute.save();
}
