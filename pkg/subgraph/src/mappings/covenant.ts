import { Bytes, JSONValueKind, dataSource, json, log } from "@graphprotocol/graph-ts";
import { Covenant } from "../../generated/schema";

export function handleCovenant(content: Bytes): void {
  const cid = dataSource.stringParam();
  log.debug("Covenant: Received covenant with CID {}", [cid]);

  let covenant = Covenant.load(cid);
  if (covenant == null) {
    covenant = new Covenant(cid);
  }

  const rawJson = json.fromBytes(content);
  if (rawJson.kind == JSONValueKind.OBJECT) {
    const obj = rawJson.toObject();
    const covenantField = obj.get("covenant");

    if (covenantField && !covenantField.isNull()) {
      covenant.text = covenantField.toString();
    } else {
      covenant.text = null;
      log.warning("Covenant: 'covenant' field missing for CID {}", [cid]);
    }
  } else {
    covenant.text = null;
    log.warning("Covenant: Unexpected JSON value for CID {}", [cid]);
  }

  covenant.save();
}
