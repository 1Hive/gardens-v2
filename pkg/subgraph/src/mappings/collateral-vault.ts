import { log } from "@graphprotocol/graph-ts";
import {
  CollateralVault,
  CollateralVaultDeposit,
} from "../../generated/schema";
import {
  CollateralVault as CollateralVaultContract,
  CollateralDeposited,
  CollateralWithdrawn,
  CollateralWithdrawn1,
} from "../../generated/templates/CollateralVault/CollateralVault";

export function handleCollateralDeposited(event: CollateralDeposited): void {
  let entity = CollateralVault.load(event.address.toHexString());
  if (entity == null) {
    entity = new CollateralVault(event.address.toHexString());
  }
  const contract = CollateralVaultContract.bind(event.address);
  entity.strategy = contract.owner().toHexString();

  let deposit = new CollateralVaultDeposit(
    event.address.toHexString() +
      "-" +
      event.params.proposalId +
      "-" +
      event.params.user,
  );

  deposit.collateralVault = event.address.toHexString();
  deposit.amount = event.params.amount;
  deposit.depositor = event.params.user;
  deposit.createdAt = event.block.timestamp;
  deposit.proposalId = event.params.proposalId;
  deposit.save();

  entity.save();
}

export function handleCollateralWithdrawn(event: CollateralWithdrawn): void {
  let deposit = new CollateralVaultDeposit(
    event.address.toHexString() +
      "-" +
      event.params.proposalId +
      "-" +
      event.params.user,
  );

  deposit.amount = deposit.amount.minus(event.params.amount);
  deposit.withdrawnAt = event.block.timestamp;
  deposit.withdrawnTo = event.params.user;

  if (event.params.isInsufficientAvailableAmount) {
    log.error(
      "Insufficient available amount to withdraw for proposalId {} and from user {}",
      [event.params.proposalId.toString(), event.params.user.toHexString()],
    );
  }

  deposit.save();
}

export function handleCollateralWithdrawnFor(
  event: CollateralWithdrawn1,
): void {
  let deposit = new CollateralVaultDeposit(
    event.address.toHexString() +
      "-" +
      event.params.proposalId +
      "-" +
      event.params.fromUser,
  );

  deposit.amount = deposit.amount.minus(event.params.amount);
  deposit.withdrawnAt = event.block.timestamp;
  deposit.withdrawnTo = event.params.toUser;

  if (event.params.isInsufficientAvailableAmount) {
    log.error(
      "Insufficient available amount to withdraw for proposalId {} and from user {}",
      [event.params.proposalId.toString(), event.params.fromUser.toHexString()],
    );
  }

  deposit.save();
}
