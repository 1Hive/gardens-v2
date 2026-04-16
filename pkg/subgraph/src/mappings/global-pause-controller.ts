import {
  ContractPaused,
  ContractUnpaused,
  SelectorPaused,
  SelectorUnpaused
} from "../../generated/GlobalPauseController/GlobalPauseController";
import { GlobalPauseController } from "../../generated/schema";
import { BigInt } from "@graphprotocol/graph-ts";

function loadOrCreateTarget(
  targetHex: string,
  timestamp: BigInt
): GlobalPauseController {
  let item = GlobalPauseController.load(targetHex);
  if (item == null) {
    item = new GlobalPauseController(targetHex);
    item.pausedUntil = null;
    item.pausedSelectors = [];
    item.createdAt = timestamp;
    item.updatedAt = timestamp;
    return item;
  }

  if (item.get("pausedSelectors") == null) {
    item.pausedSelectors = [];
  }
  if (item.get("createdAt") == null) {
    item.createdAt = timestamp;
  }
  if (item.get("updatedAt") == null) {
    item.updatedAt = timestamp;
  }
  item.updatedAt = timestamp;
  return item;
}

function tupleString(selectorHex: string, until: BigInt): string {
  return "[\"" + selectorHex + "\",\"" + until.toString() + "\"]";
}

function selectorOf(tupleValue: string): string {
  // Expected format: ["0x12345678","1700000000"]
  const parts = tupleValue.split("\"");
  return parts.length >= 2 ? parts[1] : tupleValue;
}

function removeSelectorTuple(values: string[], selectorHex: string): string[] {
  let next: string[] = [];
  for (let i = 0; i < values.length; i++) {
    if (selectorOf(values[i]) != selectorHex) {
      next.push(values[i]);
    }
  }
  return next;
}

export function handleContractPaused(event: ContractPaused): void {
  const targetHex = event.params.target.toHexString();
  let item = loadOrCreateTarget(targetHex, event.block.timestamp);
  item.pausedUntil = event.params.until;
  item.save();
}

export function handleContractUnpaused(event: ContractUnpaused): void {
  const targetHex = event.params.target.toHexString();
  let item = loadOrCreateTarget(targetHex, event.block.timestamp);
  item.pausedUntil = null;
  item.save();
}

export function handleSelectorPaused(event: SelectorPaused): void {
  const targetHex = event.params.target.toHexString();
  const selectorHex = event.params.selector.toHexString();
  let item = loadOrCreateTarget(targetHex, event.block.timestamp);
  let next = removeSelectorTuple(item.pausedSelectors, selectorHex);
  next.push(tupleString(selectorHex, event.params.until));
  item.pausedSelectors = next;
  item.save();
}

export function handleSelectorUnpaused(event: SelectorUnpaused): void {
  const targetHex = event.params.target.toHexString();
  const selectorHex = event.params.selector.toHexString();
  let item = loadOrCreateTarget(targetHex, event.block.timestamp);
  item.pausedSelectors = removeSelectorTuple(item.pausedSelectors, selectorHex);
  item.save();
}
