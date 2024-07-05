import {
  CVStrategy,
  PassportScorer,
  PassportStrategy,
  PassportUser,
} from "../../generated/schema";
import { log, BigInt } from "@graphprotocol/graph-ts";
import {
  UserScoreAdded,
  UserRemoved,
  StrategyAdded,
  StrategyActivated,
} from "../../generated/PassportScorer/PassportScorer";

export function handleUserScoreAdded(event: UserScoreAdded): void {
  let passportScorer = PassportScorer.load(event.address.toHexString());
  if (passportScorer == null) {
    passportScorer = new PassportScorer(event.address.toHexString());
    passportScorer.save();
  }

  let passportUser = PassportUser.load(event.params.user.toHexString());
  if (passportUser == null) {
    passportUser = new PassportUser(event.params.user.toHexString());
  }
  passportUser.score = event.params.score;
  passportUser.userAddress = event.params.user.toHexString();
  passportUser.lastUpdated = event.block.timestamp;
  passportUser.passportScorer = passportScorer.id;
  passportUser.save();
}

export function handleUserRemoved(event: UserRemoved): void {
  let passportUser = PassportUser.load(event.params.user.toHexString());
  if (passportUser == null) {
    log.debug("PassportUser not found: {}", [event.params.user.toHexString()]);
    return;
  }
  passportUser.score = BigInt.fromI32(0);
  passportUser.save();
}

export function handleStrategyAdded(event: StrategyAdded): void {
  let passportScorer = PassportScorer.load(event.address.toHexString());
  if (passportScorer == null) {
    passportScorer = new PassportScorer(event.address.toHexString());
    passportScorer.save();
  }
  let cvStrategy = CVStrategy.load(event.params.strategy.toHexString());
  if (cvStrategy == null) {
    log.debug("CvStrategy  not found: {}", [
      event.params.strategy.toHexString(),
    ]);
    return;
  }

  let strategy = new PassportStrategy(event.params.strategy.toHexString());
  strategy.passportScorer = event.address.toHexString();
  strategy.threshold = event.params.threshold;
  strategy.councilSafe = event.params.councilSafe.toHexString();
  strategy.active = false;
  strategy.strategy = cvStrategy.id;
  strategy.save();
}

export function handleStrategyActivated(event: StrategyActivated): void {
  let strategy = PassportStrategy.load(event.params.strategy.toHexString());
  if (strategy == null) {
    log.debug("PassportStrategy  not found: {}", [
      event.params.strategy.toHexString(),
    ]);
    return;
  }
  strategy.active = true;
  strategy.save();
}
