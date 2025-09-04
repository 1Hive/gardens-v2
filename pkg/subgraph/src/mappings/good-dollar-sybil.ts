import {
  CVStrategy,
  SybilProtection,
  PassportStrategy,
  PassportUser,
  GoodDollarUser,
  GoodDollarStrategy
} from "../../generated/schema";
import { log, BigInt } from "@graphprotocol/graph-ts";
import {
  Initialized,
  UserValidated,
  UserInvalidated,
  GoodDollarStrategyAdded
} from "../../generated/GoodDollarSybil/GoodDollarSybil";

const GoodDollarType = "GoodDollar";

export function handleInitialized(event: Initialized): void {
  let goodDollarSybil = new SybilProtection(event.address.toHexString());
  goodDollarSybil.type = GoodDollarType;
  goodDollarSybil.save();
}

export function handleUserValidated(event: UserValidated): void {
  let goodDollarSybil = SybilProtection.load(event.address.toHexString());

  if (goodDollarSybil == null) {
    goodDollarSybil = new SybilProtection(event.address.toHexString());
    goodDollarSybil.type = GoodDollarType;
    goodDollarSybil.save();
    log.error(
      "GoodDollar protection: handleValidated, SybilProtection not found: {}",
      [event.address.toHexString()]
    );
  }

  let goodDollarUser = GoodDollarUser.load(event.params.user.toHexString());
  if (goodDollarUser == null) {
    goodDollarUser = new GoodDollarUser(event.params.user.toHexString());
  }

  goodDollarUser.verified = true;
  goodDollarUser.userAddress = event.params.user.toHexString();
  goodDollarUser.lastUpdated = event.block.timestamp;
  goodDollarUser.sybilProtection = goodDollarSybil.id;
  goodDollarUser.save();
}

export function handleUserInvalidated(event: UserInvalidated): void {
  let goodDollarUser = GoodDollarUser.load(event.params.user.toHexString());
  if (goodDollarUser == null) {
    goodDollarUser = new GoodDollarUser(event.params.user.toHexString());
    goodDollarUser.save();
    log.debug("PassportScorer: PassportUser not found: {}", [
      event.params.user.toHexString()
    ]);
  }
  goodDollarUser.verified = false;
  goodDollarUser.save();
}

export function handleStrategyAdded(event: GoodDollarStrategyAdded): void {
  let goodDollarUser = SybilProtection.load(event.address.toHexString());
  if (goodDollarUser == null) {
    goodDollarUser = new SybilProtection(event.address.toHexString());
    goodDollarUser.type = GoodDollarType;
    goodDollarUser.save();
    log.error(
      "PassportScorer: handleStrategyAdded, PassportScorer not found: {}",
      [event.address.toHexString()]
    );
  }

  let strategy = new GoodDollarStrategy(event.params.strategy.toHexString());
  strategy.sybilProtection = event.address.toHexString();
  strategy.councilSafe = event.params.councilSafe.toHexString();
  strategy.active = true;
  strategy.strategy = event.params.strategy.toHexString();
  strategy.save();
}
