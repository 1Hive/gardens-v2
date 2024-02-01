import { CVProposal, CVStrategy, CVStrategyConfig, ProposalMetadata } from "../../generated/schema";
import { ProposalMetadata as ProposalMetadataTemplate } from "../../generated/templates";

import {InitializedCV, ProposalCreated, CVStrategy as CVStrategyContract} from "../../generated/CVStrategy/CVStrategy";
import { BigInt, log, Bytes, json, dataSource, DataSourceTemplate, ethereum, Value } from '@graphprotocol/graph-ts'

export const CTX_PROPOSAL_ID = 'proposalId';
export const CTX_METADATA_ID = 'metadataId';

export function handleInitialized(event: InitializedCV): void {
    log.debug("handleInitialized", []);
    const poolIdString = event.params.poolId.toHex();
    const registryCommunity = event.params.data.registryCommunity.toHexString();
    const decay = event.params.data.decay;
    const maxRatio = event.params.data.maxRatio;
    const weight = event.params.data.weight;
    
    log.debug("handleInitialized registryCommunity:{} decay:{} maxRatio:{} weight:{}", [registryCommunity, decay.toString(), maxRatio.toString(), weight.toString()]);

    let cvs = new CVStrategy(event.address.toHex());
    cvs.registryCommunity = registryCommunity;
    let config = new CVStrategyConfig(`${event.address.toHex()}-${poolIdString}-config`);

    config.decay = decay;
    config.maxRatio = maxRatio;
    config.weight = weight;

    config.save();

    cvs.config = config.id;

    cvs.save();
}

export function handleProposalCreated(event: ProposalCreated): void {
    // log.debug("handleProposalCreated", []);
    const proposalIdString = event.params.proposalId.toHex();
    const cvsId = event.address.toHex();
    const cvc = CVStrategyContract.bind(event.address);

    let p = cvc.getProposal(event.params.proposalId);
    
    let newProposal = new CVProposal(proposalIdString);
    newProposal.strategy = cvsId;
    
    newProposal.beneficiary = p.getBeneficiary().toHex();
    newProposal.requestedToken = p.getRequestedToken().toHex();

    newProposal.blockLast = p.getBlockLast();
    newProposal.convictionLast = p.getConvictionLast();
    newProposal.threshold = p.getThreshold();
    newProposal.stakedTokens = p.getStakedTokens();
    
    newProposal.requestedAmount = p.getRequestedAmount();
    
    newProposal.proposalStatus = BigInt.fromI32(p.getProposalStatus());
    newProposal.proposalType = BigInt.fromI32(p.getProposalType());
    newProposal.submitter = p.getSubmitter().toHex();
    newProposal.voterStakedPointsPct = p.getVoterStakedPointsPct();
    newProposal.agreementActionId = p.getAgreementActionId();
    
    const pointer = cvc.getMetadata(event.params.proposalId).pointer;
    
    newProposal.metadata = pointer;
    // const metadataID = `${pointer}-${proposalIdString}`;
    const metadataID = `${pointer}`;
    newProposal.proposalMetadata = metadataID; 
    log.debug("handleProposalCreated pointer:{}", [metadataID]);
    newProposal.createdAt = event.block.timestamp;
    newProposal.updatedAt = event.block.timestamp;

    const ctx = dataSource.context();
    ctx.setString(CTX_PROPOSAL_ID, proposalIdString);
    ctx.setString(CTX_METADATA_ID, proposalIdString);
    const pm = ProposalMetadata.load(pointer);
    if (pm == null) {
        ProposalMetadataTemplate.createWithContext(pointer,ctx);
    }
    // ProposalMetadataTemplate.create(pointer);

    newProposal.save();
    
}