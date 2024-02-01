import { Bytes, dataSource, log, json, BigInt } from "@graphprotocol/graph-ts";
import { ProposalMetadata } from "../../generated/schema";
import { CTX_METADATA_ID, CTX_PROPOSAL_ID } from "./cv-strategy";
// https://kdghxz4drlsffkptavafm6ws2qkdwpdqauxstqioi3xdli7yjo4q.arweave.net/UMx754OK5FKp8wVAVnrS1BQ7PHAFLynBDkbuNaP4S7k
export function handleProposalMetadata(content: Bytes): void {
  let hash = dataSource.stringParam();
  const ctx = dataSource.context();
  const proposalId = ctx.getString(CTX_PROPOSAL_ID);
  const metadataId = ctx.getString(CTX_METADATA_ID);

  log.debug("handleProposalMetadata1: {} {} {}", [hash,proposalId,metadataId]);
  let proposalData = ProposalMetadata.load(hash);
  if (!proposalData) {
    proposalData = new ProposalMetadata(hash);
    let jsonObject = json.fromBytes(content).toObject();

    if (jsonObject) {
        let version = jsonObject.get('v');
        let proposalTitle = jsonObject.get('title');
        let proposalDescription = jsonObject.get('description');
        proposalData.title = proposalTitle?proposalTitle.toString(): '';
        proposalData.content = proposalDescription?proposalDescription.toString(): '';
        proposalData.version = version?version.toBigInt():BigInt.zero();
        // proposalData.proposal = proposalId;
        proposalData.save();
    }
  }
}