import {
  CVProposal,
  CVStrategy,
  CVStrategyConfig,
  Member,
  // ProposalMeta as ProposalMetadata,
} from "../../generated/schema";
// import { ProposalMetadata as ProposalMetadataTemplate } from "../../generated/templates";

import {
  Distributed,
  InitializedCV,
  ProposalCreated,
  CVStrategy as CVStrategyContract,
  PoolAmountIncreased,
  SupportAdded,
  PowerIncreased,
  PowerDecreased,
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
  const weight = event.params.data.weight;
  const pType = event.params.data.proposalType;
  const pointsPerMember = event.params.data.pointConfig.pointsPerMember;
  const pointsPerTokenStaked =
    event.params.data.pointConfig.pointsPerTokenStaked;
  const tokensPerPoint = event.params.data.pointConfig.tokensPerPoint;
  const maxAmount = event.params.data.pointConfig.maxAmount;
  const pointSystem = event.params.data.pointSystem;

  log.debug(
    "handleInitialized registryCommunity:{} decay:{} maxRatio:{} weight:{} pType:{} pointsPerMember:{} pointsPerTokenStaked:{} tokensPerPoint:{} maxAmount:{}",
    [
      registryCommunity,
      decay.toString(),
      maxRatio.toString(),
      weight.toString(),
      pType.toString(),
      pointsPerMember.toString(),
      pointsPerTokenStaked.toString(),
      tokensPerPoint.toString(),
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
  cvs.maxCVStaked = BigInt.fromI32(0);
  cvs.totalEffectiveActivePoints = cvc.totalEffectiveActivePoints();

  config.decay = decay;
  config.maxRatio = maxRatio;
  config.weight = weight;
  config.proposalType = BigInt.fromI32(pType);
  config.pointSystem = BigInt.fromI32(pointSystem);
  config.pointsPerMember = pointsPerMember;
  config.pointsPerTokenStaked = pointsPerTokenStaked;
  config.tokensPerPoint = tokensPerPoint;
  config.maxAmount = maxAmount;

  config.D = cvc.D();
  config.save();

  cvs.config = config.id;

  cvs.save();
}

export function handleProposalCreated(event: ProposalCreated): void {
  const proposalIdString = event.params.proposalId.toHex();
  const cvsId = event.address.toHex();
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

  let newProposal = new CVProposal(proposalIdString);
  newProposal.strategy = cvsId;

  newProposal.beneficiary = proposal.getBeneficiary().toHex();
  let requestedToken = proposal.getRequestedToken();
  newProposal.requestedToken = requestedToken.toHex();

  newProposal.blockLast = proposal.getBlockLast();
  newProposal.convictionLast = proposal.getConvictionLast();
  newProposal.threshold = proposal.getThreshold();
  newProposal.stakedTokens = proposal.getStakedTokens();

  newProposal.requestedAmount = proposal.getRequestedAmount();

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
  cvs.poolAmount = event.params.amount;
  cvs.save();
}

export function handleSupportAdded(event: SupportAdded): void {
  log.debug("handleSupportAdded: amount: {}", [event.params.amount.toString()]);

  let cvp = CVProposal.load(event.params.proposalId.toHexString());
  if (cvp == null) {
    log.debug("handleSupportAdded cvp not found: {}", [
      event.params.proposalId.toString(),
    ]);
    return;
  }
  const cvc = CVStrategyContract.bind(event.address);
  const proposalStakedAmount = cvc.getProposalStakedAmount(
    event.params.proposalId,
  );
  const maxConviction = cvc.getMaxConviction(proposalStakedAmount);
  const cvs = CVStrategy.load(cvp.strategy);

  if (cvs == null) {
    log.debug("handleDistributed cvs not found: {}", [cvp.strategy]);
    return;
  }

  cvs.maxCVStaked = maxConviction;

  cvp.stakedTokens = event.params.totalStakedAmount;
  cvp.convictionLast = event.params.convictionLast;
  cvp.save();
  cvs.save();
}

export function handleDistributed(event: Distributed): void {
  log.debug("handleDistributed: amount: {}", [event.params.amount.toString()]);

  let cvp = CVProposal.load(event.params.proposalId.toHexString());
  if (cvp == null) {
    log.debug("handleDistributed cvp not found: {}", [
      event.params.proposalId.toString(),
    ]);
    return;
  }
  const cvc = CVStrategyContract.bind(event.address);
  const proposalStatus = cvc
    .getProposal(event.params.proposalId)
    .getProposalStatus();

  cvp.proposalStatus = BigInt.fromI32(proposalStatus);
  cvp.save();
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

  const member = Member.load(event.params.member.toHexString());
  if (member == null) {
    log.debug("handlePowerIncreased member not found: {}", [
      event.params.member.toHexString(),
    ]);
    return;
  }

  member.totalStakedAmount = member.totalStakedAmount
    ? member.totalStakedAmount!.plus(event.params.tokensStaked)
    : event.params.tokensStaked;

  member.save();
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

  const member = Member.load(event.params.member.toHexString());
  if (member == null) {
    log.debug("handlePowerIncreased member not found: {}", [
      event.params.member.toHexString(),
    ]);
    return;
  }

  member.totalStakedAmount = member.totalStakedAmount
    ? member.totalStakedAmount!.minus(event.params.tokensUnStaked)
    : BigInt.fromI32(0);

  member.save();
}
