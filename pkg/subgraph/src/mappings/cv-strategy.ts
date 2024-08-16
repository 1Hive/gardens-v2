import {
  CVProposal,
  CVStrategy,
  CVStrategyConfig,
  MemberStrategy,
  Stake,
  Member,
  ProposalDispute
} from "../../generated/schema";
import { ProposalDisputeMetadata as ProposalDisputeMetadataTemplate } from "../../generated/templates";

import {
  Distributed,
  InitializedCV,
  ProposalCreated,
  CVStrategyV0_0 as CVStrategyContract,
  PoolAmountIncreased,
  SupportAdded,
  PowerIncreased,
  PowerDecreased,
  PointsDeactivated,
  Ruling,
  ProposalDisputed,
  PoolParamsUpdated,
  InitializedCVDataCvParamsStruct,
  InitializedCVDataArbitrableConfigStruct,
  PoolParamsUpdatedCvParamsStruct,
  PoolParamsUpdatedArbitrableConfigStruct
} from "../../generated/templates/CVStrategyV0_0/CVStrategyV0_0";

import { Allo as AlloContract } from "../../generated/templates/CVStrategyV0_0/Allo";

import { Address, BigInt, log } from "@graphprotocol/graph-ts";

import { json, JSONValueKind } from "@graphprotocol/graph-ts";

// export const CTX_PROPOSAL_ID = "proposalId";
// export const CTX_METADATA_ID = "metadataId";

const PROPOSAL_STATUS_ACTIVE = BigInt.fromI32(1);
const PROPOSAL_STATUS_DISPUTED = BigInt.fromI32(5);
const PROPOSAL_STATUS_REJECTED = BigInt.fromI32(6);

const DISPUTE_STATUS_WAITING = BigInt.fromI32(0);
const DISPUTE_STATUS_SOLVED = BigInt.fromI32(1);

const DISPUTE_RULED_IN_FAVOR_OF_CHALLENGER = BigInt.fromI32(2);

export function handleInitialized(event: InitializedCV): void {
  log.debug("CVStrategy: handleInitialized {}", [
    event.params.poolId.toString()
  ]);
  const poolId = event.params.poolId;
  const registryCommunity = event.params.data.registryCommunity.toHexString();
  const pType = event.params.data.proposalType;
  const maxAmount = event.params.data.pointConfig.maxAmount;
  const pointSystem = event.params.data.pointSystem;
  // log.debug(
  //   "handleInitialized registryCommunity:{} decay:{} maxRatio:{} minThresholdPoints:{} weight:{} pType:{} maxAmount:{}",
  //   [registryCommunity, pType.toString(), maxAmount.toString()]
  // );
  const cvc = CVStrategyContract.bind(event.address);
  let cvs = new CVStrategy(event.address.toHex());
  let alloAddr = cvc.getAllo();
  log.debug("CVStrategy: alloAddr:{}", [alloAddr.toHexString()]);
  const allo = AlloContract.bind(alloAddr);
  let metadata = allo.getPool(poolId).metadata.pointer;
  if (metadata) {
    log.debug("CVStrategy: metadata:{}", [metadata.toString()]);
    cvs.metadata = metadata ? metadata.toString() : null;
  }
  cvs.poolId = poolId;
  cvs.registryCommunity = registryCommunity;
  let config = new CVStrategyConfig(
    `${event.address.toHex()}-${poolId.toString()}-config`
  );
  cvs.poolAmount = cvc.getPoolAmount();
  cvs.maxCVSupply = BigInt.fromI32(0);
  cvs.totalEffectiveActivePoints = cvc.totalEffectiveActivePoints();
  cvs.isEnabled = false;
  config.proposalType = BigInt.fromI32(pType);
  config.pointSystem = BigInt.fromI32(pointSystem);
  config.maxAmount = maxAmount;

  log.debug("handleInitialized changetypes", []);
  let cvParams = changetype<PoolParamsUpdatedCvParamsStruct>(
    event.params.data.cvParams
  );
  let arbitrableConfig = changetype<PoolParamsUpdatedArbitrableConfigStruct>(
    event.params.data.arbitrableConfig
  );

  computeConfig(config, cvParams, arbitrableConfig);

  config.D = cvc.D();
  config.save();
  cvs.config = config.id;
  cvs.save();
}

export function handleProposalCreated(event: ProposalCreated): void {
  const cvsId = event.address.toHexString();
  const proposalIdString = `${cvsId}-${event.params.proposalId.toString()}`;

  const cvc = CVStrategyContract.bind(event.address);

  log.debug("CVStrategy: handleProposalCreated proposalIdString:{} cvsId:{} ", [
    proposalIdString,
    cvsId
  ]);

  let p = cvc.try_getProposal(event.params.proposalId);
  if (p.reverted) {
    log.error("CvStrategy: handleProposalCreated proposal reverted:{}", [
      proposalIdString
    ]);
    return;
  }
  let proposal = p.value;

  const proposalStakedAmount = cvc.getProposalStakedAmount(
    event.params.proposalId
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

  newProposal.proposalStatus = BigInt.fromI32(
    cvc.getProposal(event.params.proposalId).getProposalStatus()
  );
  // newProposal.proposalType = BigInt.fromI32(proposal.proposalType());
  newProposal.submitter = proposal.getSubmitter().toHex();
  // newProposal.voterStakedPointsPct = proposal.getVoterStakedPointsPct();
  // newProposal.agreementActionId = proposal.getAgreementActionId();

  const pointer = cvc.getMetadata(event.params.proposalId).pointer;

  newProposal.metadata = pointer;
  // const metadataID = `${pointer}-${proposalIdString}`;
  const metadataID = `${pointer}`;
  // newProposal.proposalMeta = metadataID;
  log.debug("CVStrategy: handleProposalCreated pointer:{}", [metadataID]);
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
  log.debug("CVStrategy: handlePoolAmountIncreased: amount: {}", [
    event.params.amount.toString()
  ]);
  let cvs = CVStrategy.load(event.address.toHexString());
  if (cvs == null) {
    log.debug("CVStrategy: handlePoolAmountIncreased cvs not found: {}", [
      event.address.toHexString()
    ]);
    return;
  }

  cvs.poolAmount = cvs.poolAmount
    ? cvs.poolAmount.plus(event.params.amount)
    : event.params.amount;
  cvs.save();
}

export function handleSupportAdded(event: SupportAdded): void {
  log.debug("CVStrategy: handleSupportAdded: amount: {}", [
    event.params.amount.toString()
  ]);

  const proposalId = `${event.address.toHexString()}-${event.params.proposalId}`;

  let cvp = CVProposal.load(proposalId);
  if (cvp == null) {
    log.debug("CVStrategy: handleSupportAdded cvp not found: {}", [
      proposalId.toString()
    ]);
    return;
  }

  let cvs = CVStrategy.load(cvp.strategy);
  if (cvs == null) {
    log.debug("CVStrategy: handleSupportAdded cvs not found: {}", [
      cvp.strategy.toString()
    ]);
    return;
  }

  const memberStrategyId = `${event.params.from.toHexString()}-${cvs.id}`;
  let stakeId = `${cvp.id.toString()}-${memberStrategyId}`;

  let stake = Stake.load(stakeId);

  let memberStrategy = MemberStrategy.load(memberStrategyId);

  if (memberStrategy == null) {
    log.debug("CVStrategy: handleSupportAdded memberStrategy not found: {}", [
      memberStrategyId.toString()
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
    event.params.proposalId
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
                proposal.proposalNumber
              );
              if (contractProposal.reverted) {
                log.error(
                  "handlePointsDeactivated contractProposal reverted:{}",
                  [proposal.proposalNumber.toString()]
                );
                return;
              }
              let prop = contractProposal.value;
              const maxConviction = cvc.getMaxConviction(
                prop.value4 // proposalStakedAmount
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
                  [memberStrategyId.toString()]
                );
              }
              log.debug(
                "CVStrategy: handlePointsDeactivated stake not found: {}",
                [stakes[i].id.toString()]
              );
            }
          } else {
            log.debug(
              "CVStrategy: handlePointsDeactivated strategy not found: {}",
              [proposal.strategy.toString()]
            );
          }
        } else {
          log.debug(
            "CVStrategy: handlePointsDeactivated proposal not found: {}",
            [stakes[i].proposal.toString()]
          );
        }
      }
    }
  } else {
    log.debug("CVStrategy: handlePointsDeactivated member not found: {}", [
      event.params.member.toHexString()
    ]);
  }
}

export function handleDistributed(event: Distributed): void {
  log.debug("CVStrategy: handleDistributed: amount: {}", [
    event.params.amount.toString()
  ]);

  const proposalId = `${event.address.toHexString()}-${event.params.proposalId}`;

  let cvp = CVProposal.load(proposalId);
  if (cvp == null) {
    log.debug("CVStrategy: handleDistributed cvp not found: {}", [
      event.params.proposalId.toString()
    ]);
    return;
  }

  let cvs = CVStrategy.load(cvp.strategy);
  if (cvs == null) {
    log.debug("CVStrategy: handleDistributed cvs not found: {}", [
      cvp.strategy.toString()
    ]);
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
    log.debug("CVStrategy: handlePowerIncreased cvs not found: {}", [
      event.address.toHexString()
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
    log.debug("CVStrategy: handlePowerDecreased cvs not found: {}", [
      event.address.toHexString()
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
    log.debug("CVStrategy: handlePowerDecreased memberStrategy not found: {}", [
      memberStrategyId.toString()
    ]);
    return;
  }

  memberStrategy.activatedPoints = memberStrategy.activatedPoints
    ? memberStrategy.activatedPoints!.minus(event.params.pointsToDecrease)
    : BigInt.fromI32(0);

  memberStrategy.save();
}

export function handlePoolParamsUpdated(event: PoolParamsUpdated): void {
  let cvs = CVStrategy.load(event.address.toHexString());
  if (cvs == null) {
    log.error("CVStrategy: handlePoolParamsUpdated cvs not found: {}", [
      event.address.toHexString()
    ]);
    return;
  }

  let config = CVStrategyConfig.load(cvs.config);
  if (config == null) {
    log.error("CVStrategy: handlePoolParamsUpdated config not found: {}", [
      event.address.toHexString()
    ]);
    return;
  }

  log.debug(
    "handlePoolParamsUpdated: CVParams:[weight:{},decay:{},minThresholdPoints:{},maxRatio:{}]",
    [
      event.params.cvParams.weight.toString(),
      event.params.cvParams.decay.toString(),
      event.params.cvParams.minThresholdPoints.toString(),
      event.params.cvParams.maxRatio.toString()
    ]
  );

  log.debug(
    "handlePoolParamsUpdated: ArbitrationConfig:[arbitrator:{},tribunalSafe:{},challengerCollateralAmount:{},submitterCollateralAmount:{},defaultRuling:{},defaultRulingTimeout:{}]",
    [
      event.params.arbitrableConfig.arbitrator.toHexString(),
      event.params.arbitrableConfig.tribunalSafe.toHexString(),
      event.params.arbitrableConfig.challengerCollateralAmount.toString(),
      event.params.arbitrableConfig.submitterCollateralAmount.toString(),
      event.params.arbitrableConfig.defaultRuling.toString(),
      event.params.arbitrableConfig.defaultRulingTimeout.toString()
    ]
  );

  computeConfig(config, event.params.cvParams, event.params.arbitrableConfig);

  config.save();
}

function computeConfig(
  config: CVStrategyConfig,
  cvParams: PoolParamsUpdatedCvParamsStruct,
  arbitrationConfig: PoolParamsUpdatedArbitrableConfigStruct
): void {
  // CV Params
  log.debug("CVParams:[weight:{},decay:{},minThresholdPoints:{},maxRatio:{}]", [
    cvParams.weight.toString(),
    cvParams.decay.toString(),
    cvParams.minThresholdPoints.toString(),
    cvParams.maxRatio.toString()
  ]);
  config.weight = cvParams.weight;
  config.decay = cvParams.decay;
  config.minThresholdPoints = cvParams.minThresholdPoints;
  config.maxRatio = cvParams.maxRatio;

  // ArbitrationConfig
  config.arbitrator = arbitrationConfig.arbitrator.toHexString();
  config.tribunalSafe = arbitrationConfig.tribunalSafe.toHexString();
  config.challengerCollateralAmount =
    arbitrationConfig.challengerCollateralAmount;
  config.submitterCollateralAmount =
    arbitrationConfig.submitterCollateralAmount;
  config.defaultRuling = arbitrationConfig.defaultRuling;
  config.defaultRulingTimeout = arbitrationConfig.defaultRulingTimeout;
}

export function handleProposalDisputed(event: ProposalDisputed): void {
  log.debug("CVStrategy: handleProposalDisputed: proposalId: {}", [
    event.params.proposalId.toString()
  ]);
  let dispute = new ProposalDispute(
    event.params.arbitrator.toHexString() +
      "_" +
      event.params.disputeId.toString()
  );
  let proposalId =
    event.address.toHexString() + "-" + event.params.proposalId.toString();
  dispute.disputeId = event.params.disputeId;
  dispute.challenger = event.params.challenger.toHexString();
  dispute.proposal = proposalId;
  dispute.createdAt = event.block.timestamp;
  dispute.context = event.params.context;
  dispute.metadata = event.params.context;
  dispute.status = DISPUTE_STATUS_WAITING;

  ProposalDisputeMetadataTemplate.create(dispute.metadata);
  dispute.save();

  // Change proposal status to disputed
  let proposal = CVProposal.load(proposalId);
  if (proposal == null) {
    log.error("CvStrategy: Proposal not found with: {}", [proposalId]);
    return;
  }

  let cvc = CVStrategyContract.bind(event.address);

  proposal.proposalStatus = BigInt.fromI32(
    cvc.getProposal(event.params.proposalId).getProposalStatus()
  );
  proposal.save();
}

export function handleDisputeRuled(event: Ruling): void {
  let dispute = ProposalDispute.load(
    event.params._arbitrator.toHexString() +
      "_" +
      event.params._disputeID.toString()
  );

  if (dispute == null) {
    log.error("CvStrategy: Dispute not found with: {}_{}", [
      event.params._arbitrator.toHexString(),
      event.params._disputeID.toString()
    ]);
    return;
  }
  log.debug("CVStrategy: handleDisputeRuled: disputeId", [
    dispute.id.toString()
  ]);

  dispute.status = DISPUTE_STATUS_SOLVED;
  dispute.ruledAt = event.block.timestamp;
  dispute.rulingOutcome = event.params._ruling;

  let proposal = CVProposal.load(dispute.proposal);
  if (proposal == null) {
    log.error("CvStrategy: Proposal not found with: {}", [dispute.proposal]);
    return;
  }

  dispute.save();

  let cvc = CVStrategyContract.bind(event.address);

  proposal.proposalStatus = BigInt.fromI32(
    cvc.getProposal(proposal.proposalNumber).getProposalStatus()
  );

  proposal.save();
}
