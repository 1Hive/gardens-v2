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
  Initialized,
  ThresholdModified,
  StrategyRemoved,
} from "../../generated/PassportScorer/PassportScorer";

export function handleInitialized(event: Initialized): void {
  let passportScorer = new PassportScorer(event.address.toHexString());
  passportScorer.save();
}

export function handleUserScoreAdded(event: UserScoreAdded): void {
  let passportScorer = PassportScorer.load(event.address.toHexString());

  if (passportScorer == null) {
    passportScorer = new PassportScorer(event.address.toHexString());
    passportScorer.save();
    log.error(
      "PassportScorer: handleUserScoreAdded, PassportScorer not found: {}",
      [event.address.toHexString()],
    );
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
    passportUser = new PassportUser(event.address.toHexString());
    passportUser.save();
    log.debug("PassportScorer: PassportUser not found: {}", [
      event.params.user.toHexString(),
    ]);
  }
  passportUser.score = BigInt.fromI32(0);
  passportUser.save();
}

export function handleStrategyAdded(event: StrategyAdded): void {
  let passportScorer = PassportScorer.load(event.address.toHexString());
  if (passportScorer == null) {
    passportScorer = new PassportScorer(event.address.toHexString());
    passportScorer.save();
    log.error(
      "PassportScorer: handleStrategyAdded, PassportScorer not found: {}",
      [event.address.toHexString()],
    );
  }

  let strategy = new PassportStrategy(event.params.strategy.toHexString());
  strategy.passportScorer = event.address.toHexString();
  strategy.threshold = event.params.threshold;
  strategy.councilSafe = event.params.councilSafe.toHexString();
  strategy.active = false;
  strategy.strategy = event.params.strategy.toHexString();
  strategy.save();
}

export function handleStrategyRemoved(event: StrategyRemoved): void {
  let strategy = PassportStrategy.load(event.params.strategy.toHexString());
  if (strategy == null) {
    strategy = new PassportStrategy(event.address.toHexString());
    strategy.save();
    log.error(
      "PassportScorer: handleStrategyRemoved, PassportStrategy not found: {}",
      [event.params.strategy.toHexString()],
    );
  }
  strategy.active = false;
  strategy.save();
}

export function handleStrategyActivated(event: StrategyActivated): void {
  let strategy = PassportStrategy.load(event.params.strategy.toHexString());
  if (strategy == null) {
    strategy = new PassportStrategy(event.address.toHexString());
    strategy.save();
    log.error(
      "PassportScorer: handleStrategyActivated, PassportStrategy not found: {}",
      [event.params.strategy.toHexString()],
    );
  }
  strategy.active = true;
  strategy.save();
}

export function handleThresholdModified(event: ThresholdModified): void {
  let strategy = PassportStrategy.load(event.params.strategy.toHexString());
  if (strategy == null) {
    strategy = new PassportStrategy(event.address.toHexString());
    strategy.save();
    log.error(
      "PassportScorer: handleThresholdModified, PassportStrategy not found: {}",
      [event.params.strategy.toHexString()],
    );
  }
  strategy.threshold = event.params.newThreshold;
  strategy.save();
}
