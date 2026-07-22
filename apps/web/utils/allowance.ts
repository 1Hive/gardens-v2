export type AllowanceAction = "none" | "approve" | "reset-and-approve";

export const getAllowanceAction = ({
  currentAllowance,
  requiredAllowance,
  resetAllowanceIfNeeded = true,
}: {
  currentAllowance: bigint;
  requiredAllowance: bigint;
  resetAllowanceIfNeeded?: boolean;
}): AllowanceAction => {
  if (requiredAllowance <= currentAllowance) return "none";
  if (resetAllowanceIfNeeded && currentAllowance > 0n) {
    return "reset-and-approve";
  }
  return "approve";
};

export const getAllowanceWalletTransactionCount = (
  action: AllowanceAction,
  followingTransactionCount = 1,
) =>
  followingTransactionCount +
  (action === "none" ? 0
  : action === "approve" ? 1
  : 2);
