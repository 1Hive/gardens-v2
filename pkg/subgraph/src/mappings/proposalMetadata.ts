import { Bytes, dataSource, log, json, BigInt } from "@graphprotocol/graph-ts";
import { ProposalMetadata } from "../../generated/schema";
// https://kdghxz4drlsffkptavafm6ws2qkdwpdqauxstqioi3xdli7yjo4q.arweave.net/UMx754OK5FKp8wVAVnrS1BQ7PHAFLynBDkbuNaP4S7k
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