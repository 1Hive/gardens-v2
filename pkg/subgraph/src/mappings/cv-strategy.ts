import {
  ArbitrableConfig,
  CVProposal,
  CVStrategy,
  CVStrategyConfig,
  StreamingInfo,
  MemberStrategy,
  Stake,
  Member,
  ProposalDispute,
  PoolMetadata
} from "../../generated/schema";
import {
  ProposalDisputeMetadata as ProposalDisputeMetadataTemplate,
  ProposalMetadata as ProposalMetadataTemplate,
  PoolMetadata as PoolMetadataTemplate
} from "../../generated/templates";

import {
  ArbitrableConfigUpdated,
  Distributed,
  InitializedCV,
  InitializedCV2,
  ProposalCreated,
  CVStrategy as CVStrategyContract,
  SupportAdded,
  PowerIncreased,
  PowerDecreased,
  PointsDeactivated,
  Ruling,
  ProposalDisputed,
  CVParamsUpdated,
  CVParamsUpdatedCvParamsStruct,
  ProposalCancelled,
  AllowlistMembersAdded,
  AllowlistMembersRemoved,
  SybilScorerUpdated,
  InitializedCV3,
  InitializedCV3DataStruct,
  InitializedCV4,
  InitializedCV4DataStruct,
  ProposalEdited,
  SuperfluidTokenUpdated,
  SuperfluidGDAConnected,
  SuperfluidGDADisconnected,
  StreamStarted,
  StreamMemberUnitUpdated
} from "../../generated/templates/CVStrategy/CVStrategy";

import { Allo as AlloContract } from "../../generated/templates/CVStrategy/Allo";

import {
  Address,
  BigInt,
  ethereum,
  log,
  dataSource,
  Bytes,
  json
} from "@graphprotocol/graph-ts";

// export const CTX_PROPOSAL_ID = "proposalId";
// export const CTX_METADATA_ID = "metadataId";

const PROPOSAL_STATUS_ACTIVE = BigInt.fromI32(1);
const PROPOSAL_STATUS_CANCELLED = BigInt.fromI32(3);
const PROPOSAL_STATUS_EXECUTED = BigInt.fromI32(4);
const PROPOSAL_STATUS_DISPUTED = BigInt.fromI32(5);
const PROPOSAL_STATUS_REJECTED = BigInt.fromI32(6);

const DISPUTE_STATUS_WAITING = BigInt.fromI32(0);
const DISPUTE_STATUS_SOLVED = BigInt.fromI32(1);

// 10**7
const D = BigInt.fromI32(10000000);

function getMaxConviction(staked: BigInt, _decay: BigInt): BigInt {
  return staked.times(D).div(D.minus(_decay));
}

export function handleInitialized(event: InitializedCV): void {
  // @ts-ignore
  const data3 = changetype<InitializedCV3DataStruct>(event.params.data);
  data3[8] = ethereum.Value.fromAddressArray([Address.zero()]); // Initialize allowlist to everyone allowed
  data3[9] = ethereum.Value.fromAddress(Address.zero()); // Initialize allowlist to everyone allowed
  computeInitialize(event.address, event.params.poolId, data3, event.block.timestamp);
}

export function handleInitializedV2(event: InitializedCV2): void {
  // @ts-ignore
  const data3 = changetype<InitializedCV3DataStruct>(event.params.data);
  data3[9] = ethereum.Value.fromAddress(Address.zero()); // Initialize allowlist to everyone allowed
  computeInitialize(event.address, event.params.poolId, data3, event.block.timestamp);
}

export function handleInitializedV3(event: InitializedCV3): void {
  computeInitialize(
    event.address,
    event.params.poolId,
    event.params.data,
    event.block.timestamp
  );
}

export function handleInitializedV4(event: InitializedCV4): void {
  computeInitializeV4(
    event.address,
    event.params.poolId,
    event.params.data,
    event.block.timestamp
  );
}

export function handleProposalCreated(event: ProposalCreated): void {
  const cvsId = event.address.toHexString();
  const proposalIdString = `${cvsId}-${event.params.proposalId.toString()}`;

  const cvc = CVStrategyContract.bind(event.address);

  log.debug("CVStrategy: handleProposalCreated proposalIdString:{} cvsId:{} ", [
    proposalIdString,
    cvsId
  ]);

  let p = cvc.try_proposals(event.params.proposalId);
  if (p.reverted) {
    log.error(
      "CvStrategy: handleProposalCreated proposal reverted:{} (block:{})",
      [proposalIdString, event.block.number.toString()]
    );
    return;
  }
  let proposal = p.value;

  const proposalStakedAmount = cvc
    .proposals(event.params.proposalId)
    .getStakedAmount();
  const maxConviction = getMaxConviction(
    proposalStakedAmount,
    cvc.cvParams().getDecay()
  );

  let newProposal = new CVProposal(proposalIdString);
  newProposal.strategy = cvsId;
  newProposal.proposalNumber = event.params.proposalId;

  newProposal.beneficiary = proposal.getBeneficiary().toHex();
  let requestedToken = proposal.getRequestedToken();
  newProposal.requestedToken = requestedToken.toHex();

  newProposal.blockLast = proposal.getBlockLast();
  newProposal.convictionLast = proposal.getConvictionLast();
  newProposal.stakedAmount = proposal.getStakedAmount();

  newProposal.requestedAmount = proposal.getRequestedAmount();
  newProposal.maxCVStaked = maxConviction;
  newProposal.arbitrableConfig = `${event.address.toHex()}-${proposal.getArbitrableConfigVersion().toString()}`;

  newProposal.proposalStatus = getProposalStatus(
    event.address,
    event.params.proposalId,
    PROPOSAL_STATUS_ACTIVE
  );
  // newProposal.proposalType = BigInt.fromI32(proposal.proposalType());
  newProposal.submitter = proposal.getSubmitter().toHex();
  // newProposal.voterStakedPointsPct = proposal.getVoterStakedPointsPct();
  // newProposal.agreementActionId = proposal.getAgreementActionId();

  const pointer = cvc.proposals(event.params.proposalId).getMetadata().pointer;

  newProposal.metadataHash = pointer;
  newProposal.metadata = pointer;
  ProposalMetadataTemplate.create(pointer);

  // newProposal.proposalMeta = metadataID;
  log.debug("CVStrategy: handleProposalCreated: {}", [proposalIdString]);
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
  const proposalStakedAmount = cvc
    .proposals(event.params.proposalId)
    .getStakedAmount();

  const maxConviction = getMaxConviction(
    proposalStakedAmount,
    cvc.cvParams().getDecay()
  );

  memberStrategy.save();
  cvp.maxCVStaked = maxConviction;

  cvp.blockLast = event.block.number;
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

              let contractProposal = cvc.try_proposals(proposal.proposalNumber);
              if (contractProposal.reverted) {
                log.error(
                  "handlePointsDeactivated contractProposal reverted:{}",
                  [proposal.proposalNumber.toString()]
                );
                return;
              }
              let prop = contractProposal.value;
              const maxConviction = getMaxConviction(
                prop.getStakedAmount(),
                cvc.cvParams().getDecay()
              );
              proposal.maxCVStaked = maxConviction;
              proposal.convictionLast = prop.getConvictionLast();

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

  const proposalStatus = getProposalStatus(
    event.address,
    event.params.proposalId,
    PROPOSAL_STATUS_EXECUTED
  );

  cvp.proposalStatus = proposalStatus;
  cvp.executedAt = event.block.timestamp;
  cvp.save();
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
  const totalEffectiveActivePoints = cvc.totalPointsActivated();
  cvs.totalEffectiveActivePoints = totalEffectiveActivePoints;
  cvs.maxCVSupply = getMaxConviction(
    totalEffectiveActivePoints,
    cvc.cvParams().getDecay()
  );

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
  const totalEffectiveActivePoints = cvc.totalPointsActivated();
  cvs.totalEffectiveActivePoints = totalEffectiveActivePoints;
  cvs.maxCVSupply = getMaxConviction(
    totalEffectiveActivePoints,
    cvc.cvParams().getDecay()
  );

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

export function handleCVParamsUpdated(event: CVParamsUpdated): void {
  let cvs = CVStrategy.load(event.address.toHexString());
  if (cvs == null) {
    // Ignore because can be from initialization and the config will be computed there
    log.warning("CVStrategy: handlePoolParamsUpdated cvs not found: {}", [
      event.address.toHexString()
    ]);
    return;
  }

  const cvc = CVStrategyContract.bind(event.address);
  cvs.totalEffectiveActivePoints = cvc.totalPointsActivated();
  cvs.maxCVSupply = getMaxConviction(
    cvs.totalEffectiveActivePoints,
    cvc.cvParams().getDecay()
  );
  cvs.save();

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

  computeConfig(config, event.params.cvParams);
  if (config.allowlist == null) {
    config.allowlist = [];
  }

  config.save();
}

export function handleArbitrableConfigUpdated(
  event: ArbitrableConfigUpdated
): void {
  let arbitrableConfig = new ArbitrableConfig(
    `${event.address.toHex()}-${event.params.currentArbitrableConfigVersion.toString()}`
  );
  arbitrableConfig.version = event.params.currentArbitrableConfigVersion;
  arbitrableConfig.strategy = event.address.toHexString();
  arbitrableConfig.arbitrator = event.params.arbitrator.toHexString();
  arbitrableConfig.tribunalSafe = event.params.tribunalSafe.toHexString();
  arbitrableConfig.challengerCollateralAmount =
    event.params.challengerCollateralAmount;
  arbitrableConfig.submitterCollateralAmount =
    event.params.submitterCollateralAmount;
  arbitrableConfig.defaultRuling = event.params.defaultRuling;
  arbitrableConfig.defaultRulingTimeout = event.params.defaultRulingTimeout;

  arbitrableConfig.save();
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

  ProposalDisputeMetadataTemplate.create(event.params.context);
  dispute.save();

  // Change proposal status to disputed
  let proposal = CVProposal.load(proposalId);
  if (proposal == null) {
    log.error("CvStrategy: Proposal not found with: {} (block:)", [
      proposalId,
      event.block.number.toString()
    ]);
    return;
  }

  proposal.proposalStatus = getProposalStatus(
    event.address,
    event.params.proposalId,
    PROPOSAL_STATUS_DISPUTED
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
    log.error("CvStrategy: Proposal not found with: {} (block: {})", [
      dispute.proposal,
      event.block.number.toString()
    ]);
    return;
  }

  dispute.save();

  // Default status is the ruling outcome and if abstain its the default pool value
  let defaultStatus: BigInt;

  if (event.params._ruling.equals(BigInt.fromI32(1))) {
    // Approved
    defaultStatus = PROPOSAL_STATUS_ACTIVE;
  } else if (event.params._ruling.equals(BigInt.fromI32(2))) {
    // Rejected
    defaultStatus = PROPOSAL_STATUS_REJECTED;
  } else {
    let arbConfig = ArbitrableConfig.load(proposal.arbitrableConfig);
    if (arbConfig == null) {
      log.error("CvStrategy: ArbitrableConfig not found with: {}", [
        proposal.arbitrableConfig
      ]);
      return;
    }
    defaultStatus = arbConfig.defaultRuling;
  }

  proposal.proposalStatus = getProposalStatus(
    event.address,
    proposal.proposalNumber,
    defaultStatus
  );

  proposal.save();
}

export function handleProposalCancelled(event: ProposalCancelled): void {
  log.debug("CVStrategy: handleProposalCancelled: proposalId: {}", [
    event.params.proposalId.toString()
  ]);
  let proposalId =
    event.address.toHexString() + "-" + event.params.proposalId.toString();
  let proposal = CVProposal.load(proposalId);
  if (proposal == null) {
    log.error("CvStrategy: Proposal not found with: {} (block: {})", [
      proposalId,
      event.block.number.toString()
    ]);
    return;
  }

  proposal.proposalStatus = getProposalStatus(
    event.address,
    proposal.proposalNumber,
    PROPOSAL_STATUS_CANCELLED
  );

  proposal.save();
}

export function handleAllowlistMembersAdded(
  event: AllowlistMembersAdded
): void {
  if (event.params.members.length == 0) {
    return;
  }

  let config = CVStrategyConfig.load(`${event.address.toHex()}-config`);

  if (config == null) {
    log.error(
      "CVStrategy: handleAllowlistMembersAdded config not found: {} (block: {})",
      [`${event.address.toHex()}-config`, event.block.number.toString()]
    );
    return;
  }

  computeAllowList(config, event.params.members, []);
  config.save();
}

export function handleAllowlistMembersRemoved(
  event: AllowlistMembersRemoved
): void {
  if (event.params.members.length == 0) {
    return;
  }

  let config = CVStrategyConfig.load(`${event.address.toHex()}-config`);

  if (config == null) {
    log.error(
      "CVStrategy: handleAllowlistMembersRemoved config not found: {}",
      [`${event.address.toHex()}-config`]
    );
    return;
  }

  computeAllowList(config, [], event.params.members);
  config.save();
}

export function handleSybilScorerUpdated(event: SybilScorerUpdated): void {
  let cvs = CVStrategy.load(event.address.toHexString());
  if (cvs == null) {
    log.error(
      "CVStrategy: handleSybilScorerUpdated cvs not found: {} (block: {})",
      [event.address.toHexString(), event.block.number.toString()]
    );
    return;
  }

  cvs.sybil = event.params.sybilScorer.toHexString();
  cvs.save();
}

export function handleSuperfluidTokenUpdated(
  event: SuperfluidTokenUpdated
): void {
  let streamingInfo = getOrCreateStrategyStreamingInfo(
    event.address,
    event.block.timestamp
  );

  let config = CVStrategyConfig.load(`${event.address.toHex()}-config`);

  if (config == null) {
    log.error(
      "CVStrategy: handleSuperfluidTokenUpdated config not found: {} (block: {})",
      [`${event.address.toHex()}-config`, event.block.number.toString()]
    );
    return;
  }
  const token = event.params.superfluidToken;

  if (token == Address.zero()) {
    config.superfluidToken = null;
    streamingInfo.superfluidToken = null;
  } else {
    config.superfluidToken = token.toHexString();
    streamingInfo.superfluidToken = token.toHexString();
  }

  config.save();
  streamingInfo.updatedAt = event.block.timestamp;
  streamingInfo.save();
}

export function handleSuperfluidGDAConnected(
  event: SuperfluidGDAConnected
): void {
  let streamingInfo = getOrCreateStrategyStreamingInfo(
    event.address,
    event.block.timestamp
  );

  let config = CVStrategyConfig.load(`${event.address.toHex()}-config`);
  if (config == null) {
    log.error(
      "CVStrategy: handleSuperfluidGDAConnected config not found: {} (block: {})",
      [`${event.address.toHex()}-config`, event.block.number.toString()]
    );
    return;
  }

  config.superfluidGDA.push(event.params.gda.toHexString());
  if (streamingInfo.superfluidGDA.indexOf(event.params.gda.toHexString()) == -1) {
    streamingInfo.superfluidGDA.push(event.params.gda.toHexString());
  }
  config.save();
  streamingInfo.updatedAt = event.block.timestamp;
  streamingInfo.save();
}

export function handleSuperfluidGDADisconnected(
  event: SuperfluidGDADisconnected
): void {
  let streamingInfo = getOrCreateStrategyStreamingInfo(
    event.address,
    event.block.timestamp
  );

  let config = CVStrategyConfig.load(`${event.address.toHex()}-config`);
  if (config == null) {
    log.error(
      "CVStrategy: handleSuperfluidGDADisconnected config not found: {} (block: {})",
      [`${event.address.toHex()}-config`, event.block.number.toString()]
    );
    return;
  }

  const index = config.superfluidGDA.indexOf(event.params.gda.toHexString());
  if (index > -1) {
    config.superfluidGDA.splice(index, 1);
    config.save();
  } else {
    log.warning(
      "CVStrategy: handleSuperfluidGDADisconnected gda not found in config: {} (block: {})",
      [`${event.address.toHex()}-config`, event.block.number.toString()]
    );
  }

  const infoIndex = streamingInfo.superfluidGDA.indexOf(
    event.params.gda.toHexString()
  );
  if (infoIndex > -1) {
    streamingInfo.superfluidGDA.splice(infoIndex, 1);
  }
  streamingInfo.updatedAt = event.block.timestamp;
  streamingInfo.save();
}

export function handleStreamStarted(event: StreamStarted): void {
  let streamingInfo = getOrCreateStrategyStreamingInfo(
    event.address,
    event.block.timestamp
  );

  streamingInfo.streamLastStartedGDA = event.params.gda.toHexString();
  streamingInfo.streamLastFlowRate = event.params.flowRate;
  streamingInfo.updatedAt = event.block.timestamp;
  streamingInfo.save();
}

export function handleStreamMemberUnitUpdated(
  event: StreamMemberUnitUpdated
): void {
  let streamingInfo = getOrCreateStrategyStreamingInfo(
    event.address,
    event.block.timestamp
  );

  streamingInfo.streamLastMember = event.params.member.toHexString();
  streamingInfo.streamLastMemberUnit = event.params.newUnit;
  streamingInfo.updatedAt = event.block.timestamp;
  streamingInfo.save();
}

export function handlePoolMetadata(content: Bytes): void {
  const cid = dataSource.stringParam();
  log.debug("PoolMetadata: Received pool metadata with CID {}", [
    cid.toString()
  ]);

  let metadata = new PoolMetadata(cid);
  const value = json.fromBytes(content).toObject();

  metadata.id = cid;
  metadata.description = value.mustGet("description").toString();
  metadata.title = value.mustGet("title").toString();

  metadata.save();
}

export function handleProposalEdited(event: ProposalEdited): void {
  const proposalId = `${event.address.toHexString()}-${event.params.proposalId.toString()}`;
  let proposal = CVProposal.load(proposalId);

  if (proposal == null) {
    log.error(
      "CVStrategy: handleProposalEdited proposal not found: {} (block: {})",
      [proposalId, event.block.number.toString()]
    );
    return;
  }

  const pointer = event.params.metadata.pointer;
  if (pointer.length == 0) {
    log.warning(
      "CVStrategy: handleProposalEdited empty metadata pointer for proposal {}",
      [proposalId]
    );
  } else if (proposal.metadataHash != pointer) {
    proposal.metadata = pointer;
    proposal.metadataHash = pointer;
    ProposalMetadataTemplate.create(pointer);
  }

  proposal.beneficiary = event.params.beneficiary.toHex();
  proposal.requestedAmount = event.params.requestedAmount;
  proposal.updatedAt = event.block.timestamp;

  proposal.save();
}

/// -- Privates -- ///

function computeConfig(
  config: CVStrategyConfig,
  cvParams: CVParamsUpdatedCvParamsStruct
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
}

function computeAllowList(
  config: CVStrategyConfig,
  addressToAdd: Address[],
  addressToRemove: Address[]
): void {
  let members = config.allowlist;

  if (members == null) {
    members = [];
  }

  for (let i = 0; i < addressToAdd.length; i++) {
    if (members.indexOf(addressToAdd[i].toHexString()) == -1) {
      members.push(addressToAdd[i].toHexString());
    }
  }

  for (let i = 0; i < addressToRemove.length; i++) {
    let index = members.indexOf(addressToRemove[i].toHexString());
    if (index != -1) {
      members.splice(index, 1);
    }
  }

  config.allowlist = members;
}

function computeInitialize(
  contractAddress: Address,
  poolId: BigInt,
  data: InitializedCV3DataStruct,
  timestamp: BigInt
): void {
  log.debug("CVStrategy: handleInitialized {}", [poolId.toString()]);
  const registryCommunity = data.registryCommunity.toHexString();
  const pType = data.proposalType;
  const maxAmount = data.pointConfig.maxAmount;
  const pointSystem = data.pointSystem;
  // log.debug(
  //   "handleInitialized registryCommunity:{} decay:{} maxRatio:{} minThresholdPoints:{} weight:{} pType:{} maxAmount:{}",
  //   [registryCommunity, pType.toString(), maxAmount.toString()]
  // );
  const cvc = CVStrategyContract.bind(contractAddress);
  const strategyId = contractAddress.toHex();
  let cvs = CVStrategy.load(strategyId);
  if (cvs == null) {
    cvs = new CVStrategy(strategyId);
  }
  let alloAddr = cvc.getAllo();
  log.debug("CVStrategy: alloAddr:{}", [alloAddr.toHexString()]);
  const allo = AlloContract.bind(alloAddr);
  const alloPool = allo.getPool(poolId);
  let metadata = alloPool.metadata.pointer;
  if (metadata.length > 0) {
    log.debug("CVStrategy: metadata:{}", [metadata.toString()]);
    PoolMetadataTemplate.create(metadata);
    cvs.metadata = metadata;
    cvs.metadataHash = metadata;
  } else {
    cvs.metadata = null;
    cvs.metadataHash = null;
  }
  cvs.token = alloPool.token.toHexString();
  cvs.poolId = poolId;
  cvs.registryCommunity = registryCommunity;
  let config = new CVStrategyConfig(`${contractAddress.toHex()}-config`);
  config.superfluidGDA = [];
  cvs.maxCVSupply = BigInt.fromI32(0);
  cvs.totalEffectiveActivePoints = cvc.totalPointsActivated();
  cvs.isEnabled = false;
  cvs.sybil = data.sybilScorer.toHexString();
  cvs.archived = false;
  config.proposalType = BigInt.fromI32(pType);
  config.pointSystem = BigInt.fromI32(pointSystem);
  config.maxAmount = maxAmount;
  const superfluidToken = data.superfluidToken;
  if (superfluidToken == Address.zero()) {
    config.superfluidToken = null;
  } else {
    config.superfluidToken = superfluidToken.toHexString();
  }

  let streamingInfo = getOrCreateStrategyStreamingInfo(
    contractAddress,
    timestamp
  );
  streamingInfo.superfluidGDA = [];
  if (superfluidToken == Address.zero()) {
    streamingInfo.superfluidToken = null;
  } else {
    streamingInfo.superfluidToken = superfluidToken.toHexString();
  }
  streamingInfo.updatedAt = timestamp;
  streamingInfo.save();

  // @ts-ignore
  let cvParams = changetype<CVParamsUpdatedCvParamsStruct>(data.cvParams);

  computeConfig(config, cvParams);

  // With allowlist
  computeAllowList(config, data.initialAllowlist, []);

  config.D = D;
  config.save();
  cvs.config = config.id;
  cvs.save();
}

function computeInitializeV4(
  contractAddress: Address,
  poolId: BigInt,
  data: InitializedCV4DataStruct,
  timestamp: BigInt
): void {
  log.debug("CVStrategy: handleInitializedV4 {}", [poolId.toString()]);
  const registryCommunity = data.registryCommunity.toHexString();
  const pType = data.proposalType;
  const maxAmount = data.pointConfig.maxAmount;
  const pointSystem = data.pointSystem;

  const cvc = CVStrategyContract.bind(contractAddress);
  const strategyId = contractAddress.toHex();
  let cvs = CVStrategy.load(strategyId);
  if (cvs == null) {
    cvs = new CVStrategy(strategyId);
  }
  let alloAddr = cvc.getAllo();
  log.debug("CVStrategy: alloAddr:{}", [alloAddr.toHexString()]);
  const allo = AlloContract.bind(alloAddr);
  const alloPool = allo.getPool(poolId);
  let metadata = alloPool.metadata.pointer;
  if (metadata.length > 0) {
    log.debug("CVStrategy: metadata:{}", [metadata.toString()]);
    PoolMetadataTemplate.create(metadata);
    cvs.metadata = metadata;
    cvs.metadataHash = metadata;
  } else {
    cvs.metadata = null;
    cvs.metadataHash = null;
  }
  cvs.token = alloPool.token.toHexString();
  cvs.poolId = poolId;
  cvs.registryCommunity = registryCommunity;
  let config = new CVStrategyConfig(`${contractAddress.toHex()}-config`);
  config.superfluidGDA = [];
  cvs.maxCVSupply = BigInt.fromI32(0);
  cvs.totalEffectiveActivePoints = cvc.totalPointsActivated();
  cvs.isEnabled = false;
  cvs.sybil = data.sybilScorer.toHexString();
  cvs.archived = false;
  config.proposalType = BigInt.fromI32(pType);
  config.pointSystem = BigInt.fromI32(pointSystem);
  config.maxAmount = maxAmount;
  const superfluidToken = data.superfluidToken;
  if (superfluidToken == Address.zero()) {
    config.superfluidToken = null;
  } else {
    config.superfluidToken = superfluidToken.toHexString();
  }

  let streamingInfo = getOrCreateStrategyStreamingInfo(
    contractAddress,
    timestamp
  );
  streamingInfo.superfluidGDA = [];
  if (superfluidToken == Address.zero()) {
    streamingInfo.superfluidToken = null;
  } else {
    streamingInfo.superfluidToken = superfluidToken.toHexString();
  }
  streamingInfo.updatedAt = timestamp;
  streamingInfo.save();

  // @ts-ignore
  let cvParams = changetype<CVParamsUpdatedCvParamsStruct>(data.cvParams);
  computeConfig(config, cvParams);
  computeAllowList(config, data.initialAllowlist, []);

  config.D = D;
  config.save();
  cvs.config = config.id;
  cvs.save();
}

function getProposalStatus(
  contractAddress: Address,
  proposalId: BigInt,
  defaultStatus: BigInt
): BigInt {
  const cvc = CVStrategyContract.bind(contractAddress);
  const proposal = cvc.try_proposals(proposalId);
  if (proposal.reverted) {
    log.warning("CVStrategy: proposal not found: {}-{}", [
      contractAddress.toHexString(),
      proposalId.toString()
    ]);
    return defaultStatus;
  }
  return BigInt.fromI32(proposal.value.getProposalStatus());
}

function getOrCreateStrategyStreamingInfo(
  strategyAddress: Address,
  timestamp: BigInt
): StreamingInfo {
  const id = `${strategyAddress.toHexString()}-streaming`;
  let streamingInfo = StreamingInfo.load(id);

  if (streamingInfo == null) {
    streamingInfo = new StreamingInfo(id);
    streamingInfo.contractAddress = strategyAddress.toHexString();
    streamingInfo.contractType = "CVStrategy";
    streamingInfo.strategy = strategyAddress.toHexString();
    streamingInfo.registryFactory = null;
    streamingInfo.superfluidToken = null;
    streamingInfo.superfluidGDA = [];
    streamingInfo.streamLastStartedGDA = null;
    streamingInfo.streamLastFlowRate = null;
    streamingInfo.streamLastMember = null;
    streamingInfo.streamLastMemberUnit = null;
    streamingInfo.streamingEscrowFactory = null;
    streamingInfo.createdAt = timestamp;
    streamingInfo.updatedAt = timestamp;
  }

  return streamingInfo;
}
