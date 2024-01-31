import { Bytes, dataSource, log, json, BigInt } from "@graphprotocol/graph-ts";
import { ProposalMetadata } from "../../generated/schema";

export function handleProposalMetadata(content: Bytes): void {
  let hash = dataSource.stringParam();
  log.debug("handleProposalMetadata1", [hash]);
  let proposalData = new ProposalMetadata(hash)
  
  let jsonObject = json.fromBytes(content).toObject();

  if (jsonObject) {
      let version = jsonObject.get('v');
      let proposalTitle = jsonObject.get('title');
      let proposalDescription = jsonObject.get('description');
      proposalData.title = proposalTitle?proposalTitle.toString(): '';
      proposalData.content = proposalDescription?proposalDescription.toString(): '';
      proposalData.version = version?version.toBigInt():BigInt.zero();
  }
  proposalData.save();
}