import { BigInt } from "@graphprotocol/graph-ts";
import { SetNumber } from "../generated/Counter/Counter";
import { Number, Sender } from "../generated/schema";

export function handleSetNumber(event: SetNumber): void {
  let senderString = event.params.sender.toHexString();

  let sender = Sender.load(senderString);

  if (sender === null) {
    sender = new Sender(senderString);
    sender.address = event.params.sender;
    sender.createdAt = event.block.timestamp;
    sender.numberCount = BigInt.fromI32(1);
  } else {
    sender.numberCount = sender.numberCount.plus(BigInt.fromI32(1));
  }

  let number = new Number(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  );

  number.number = event.params.newNumber;
  number.sender = senderString;
  number.createdAt = event.block.timestamp;
  number.transactionHash = event.transaction.hash.toHex();

  number.save();
  sender.save();
}
