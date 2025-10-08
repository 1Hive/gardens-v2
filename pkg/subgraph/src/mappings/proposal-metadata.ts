// import { Bytes, dataSource, log, json, BigInt } from "@graphprotocol/graph-ts";
// import { ProposalMeta as ProposalMetadata } from "../../generated/schema";
// import { CTX_METADATA_ID, CTX_PROPOSAL_ID } from "./cv-strategy";

import {
  Bytes,
  dataSource,
  json,
  log,
  JSONValueKind
} from "@graphprotocol/graph-ts";
import {
  ProposalDisputeMetadata,
  ProposalMetadata,
  PoolMetadata
} from "../../generated/schema";

// https://kdghxz4drlsffkptavafm6ws2qkdwpdqauxstqioi3xdli7yjo4q.arweave.net/UMx754OK5FKp8wVAVnrS1BQ7PHAFLynBDkbuNaP4S7k
// export function handleProposalMetadata(content: Bytes): void {
//   let hash = dataSource.stringParam();
//   const ctx = dataSource.context();
//   const proposalId = ctx.getString(CTX_PROPOSAL_ID);
//   const metadataId = ctx.getString(CTX_METADATA_ID);

//   log.debug("handleProposalMetadata1: {} {} {}", [hash,proposalId,metadataId]);
//   let proposalData = ProposalMetadata.load(hash);
//   if (!proposalData) {
//     proposalData = new ProposalMetadata(hash);
//     let jsonObject = json.fromBytes(content).toObject();

//     if (jsonObject) {
//         let version = jsonObject.get('v');
//         let proposalTitle = jsonObject.get('title');
//         let proposalDescription = jsonObject.get('description');
//         proposalData.title = proposalTitle?proposalTitle.toString(): '';
//         proposalData.content = proposalDescription?proposalDescription.toString(): '';
//         proposalData.version = version?version.toBigInt():BigInt.zero();
//         // proposalData.proposal = proposalId;
//         proposalData.save();
//     }
//   }
// }

export function handleProposalDisputeMetadata(content: Bytes): void {
  const cid = dataSource.stringParam();
  log.debug("ProposalDisputeMetadata: Received dispute metadata with CID {}", [
    cid.toString()
  ]);

  let metadata = new ProposalDisputeMetadata(cid);
  const rawJson = json.fromBytes(content);
  if (rawJson.kind == JSONValueKind.OBJECT) {
    const value = rawJson.toObject();
    const reasonField = value.get("reason");
    if (reasonField && !reasonField.isNull()) {
      metadata.reason = reasonField.toString();
    } else {
      metadata.reason = null;
      log.warning(
        "ProposalDisputeMetadata: 'reason' field missing for CID {}",
        [cid]
      );
    }
  } else {
    metadata.reason = null;
    log.warning("ProposalDisputeMetadata: Unexpected JSON value for CID {}", [
      cid
    ]);
  }
  metadata.id = cid;

  metadata.save();
}

export function handleProposalMetadata(content: Bytes): void {
  const cid = dataSource.stringParam();
  log.debug("ProposalMetadata: Received proposal metadata with CID {}", [
    cid.toString()
  ]);

  let metadata = new ProposalMetadata(cid);
  const rawJson = json.fromBytes(content);
  if (rawJson.kind == JSONValueKind.OBJECT) {
    const value = rawJson.toObject();
    const descriptionField = value.get("description");
    const titleField = value.get("title");
    if (titleField == null || titleField.isNull()) {
      metadata.title = null;
      log.warning("ProposalMetadata: 'title' field missing for CID {}", [cid]);
    } else {
      metadata.title = titleField.toString();
    }
    if (descriptionField == null || descriptionField.isNull()) {
      metadata.description = null;
      log.warning("ProposalMetadata: 'description' field missing for CID {}", [
        cid
      ]);
    } else {
      metadata.description = descriptionField.toString();
    }
  } else {
    metadata.title = null;
    metadata.description = null;
    log.warning("ProposalMetadata: Unexpected JSON value for CID {}", [cid]);
  }

  metadata.id = cid;
  metadata.save();
}
