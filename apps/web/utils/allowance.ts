export type AllowanceAction =
  | "none"
  | "approve"
  | "increase"
  | "reset-and-approve";

export const increaseAllowanceAbi = [
  {
    type: "function",
    name: "increaseAllowance",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "addedValue", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

export const getAllowanceShortfall = (
  currentAllowance: bigint,
  requiredAllowance: bigint,
) =>
  requiredAllowance > currentAllowance ?
    requiredAllowance - currentAllowance
  : 0n;

export const preflightIncreaseAllowance = async (
  simulate: () => Promise<{ result?: unknown }>,
) => {
  try {
    const { result } = await simulate();
    return result === true;
  } catch {
    return false;
  }
};

export const getAllowanceAction = ({
  currentAllowance,
  requiredAllowance,
  increaseAllowanceSupported = false,
  resetAllowanceIfNeeded = true,
}: {
  currentAllowance: bigint;
  requiredAllowance: bigint;
  increaseAllowanceSupported?: boolean;
  resetAllowanceIfNeeded?: boolean;
}): AllowanceAction => {
  if (requiredAllowance <= currentAllowance) return "none";
  if (increaseAllowanceSupported && currentAllowance > 0n) return "increase";
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
  : action === "approve" || action === "increase" ? 1
  : 2);
