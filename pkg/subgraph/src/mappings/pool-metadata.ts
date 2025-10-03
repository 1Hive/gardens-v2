import { Bytes, dataSource, json, log } from "@graphprotocol/graph-ts";
import { PoolMetadata } from "../../generated/schema";

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
