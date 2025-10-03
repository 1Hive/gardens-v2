import {
  Bytes,
  dataSource,
  json,
  log,
  JSONValueKind
} from "@graphprotocol/graph-ts";
import { PoolMetadata } from "../../generated/schema";

export function handlePoolMetadata(content: Bytes): void {
  const cid = dataSource.stringParam();
  log.debug("PoolMetadata: Received pool metadata with CID {}", [
    cid.toString()
  ]);

  let metadata = new PoolMetadata(cid);
  const rawJson = json.fromBytes(content);
  if (rawJson.kind == JSONValueKind.OBJECT) {
    const obj = rawJson.toObject();

    const descriptionField = obj.get("description");
    if (descriptionField && !descriptionField.isNull()) {
      metadata.description = descriptionField.toString();
    } else {
      metadata.description = null;
      log.warning("PoolMetadata: 'description' field missing for CID {}", [
        cid
      ]);
    }
    const titleField = obj.get("title");
    if (titleField && !titleField.isNull()) {
      metadata.title = titleField.toString();
    } else {
      metadata.title = null;
      log.warning("PoolMetadata: 'title' field missing for CID {}", [cid]);
    }
  } else {
    metadata.description = null;
    metadata.title = null;
    log.warning("PoolMetadata: Unexpected JSON value for CID {}", [cid]);
  }
  metadata.id = cid;

  metadata.save();
}
