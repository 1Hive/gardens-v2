import {
  CVProposal,
  CVStrategy,
  CVStrategyConfig,
  // ProposalMeta as ProposalMetadata,
} from "../../generated/schema";
// import { ProposalMetadata as ProposalMetadataTemplate } from "../../generated/templates";

import {
  InitializedCV,
  ProposalCreated,
  CVStrategy as CVStrategyContract,
  PoolAmountIncreased,
} from "../../generated/templates/CVStrategy/CVStrategy";

import {
  BigInt,
  log,
  Bytes,
  json,
  dataSource,
  DataSourceTemplate,
  ethereum,
  Value,
} from "@graphprotocol/graph-ts";

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

  log.debug(
    "handleInitialized registryCommunity:{} decay:{} maxRatio:{} weight:{}",
    [
      registryCommunity,
      decay.toString(),
      maxRatio.toString(),
      weight.toString(),
    ],
  );

  const cvc = CVStrategyContract.bind(event.address);

  let cvs = new CVStrategy(event.address.toHex());
  cvs.poolId = poolId;
  cvs.registryCommunity = registryCommunity;
  let config = new CVStrategyConfig(
    `${event.address.toHex()}-${poolId.toString()}-config`,
  );

  cvs.poolAmount = cvc.getPoolAmount();

  config.decay = decay;
  config.maxRatio = maxRatio;
  config.weight = weight;
  config.proposalType = BigInt.fromI32(pType);
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

  let p = cvc.try_proposals(event.params.proposalId);
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

  newProposal.threshold = BigInt.zero(); //@todo should fix it

  newProposal.stakedTokens = proposal.getStakedAmount();

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
  let cvs = CVStrategy.load(event.address.toHex());
  if (cvs == null) {
    log.debug("handlePoolAmountIncreased cvs not found: {}", [
      event.address.toHexString(),
    ]);
    return;
  }
  cvs.poolAmount = event.params.amount;
  cvs.save();
}
