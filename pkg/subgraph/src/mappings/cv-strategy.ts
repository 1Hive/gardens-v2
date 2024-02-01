import { CVProposal, CVStrategy, CVStrategyConfig, ProposalMetadata } from "../../generated/schema";
import { ProposalMetadata as ProposalMetadataTemplate } from "../../generated/templates";

import {InitializedCV, ProposalCreated, CVStrategy as CVStrategyContract} from "../../generated/CVStrategy/CVStrategy";
import { BigInt, log, Bytes, json, dataSource, DataSourceTemplate } from '@graphprotocol/graph-ts'

export function handleInitialized(event: InitializedCV): void {
    log.debug("handleInitialized", []);
    const poolIdString = event.params.poolId.toHex();
    let cvs = new CVStrategy(event.address.toHex());
    cvs.registryCommunity = event.params.data.registryCommunity.toHex();
    let config = new CVStrategyConfig(`${event.address.toHex()}-${poolIdString}-config`);

    config.decay = event.params.data.decay;
    config.maxRatio = event.params.data.maxRatio;
    config.weight = event.params.data.weight;
    config.save();

    cvs.config = config.id;

    cvs.save();
}

export function handleProposalCreated(event: ProposalCreated): void {
    // log.debug("handleProposalCreated", []);
    const poolIdString = event.params.poolId.toHex();
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
    // newProposal.metadata = pointer;
    let hash ="QmW4zFLFJRN7J67EzNmdC2r2M9u2iJDha2fj5Gee6hJzSY";
    newProposal.proposalMetadata = hash; 
    log.debug("handleProposalCreated pointer:{}", [newProposal.proposalMetadata]);
    newProposal.createdAt = event.block.timestamp;
    newProposal.updatedAt = event.block.timestamp;

    ProposalMetadataTemplate.create(hash);

    newProposal.save();
    
}