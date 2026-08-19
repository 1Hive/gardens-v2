export function publishGovernanceChangeBeforeClosing(
  publishOptimisticChange: () => void,
  closeTransactionSurface?: () => void,
) {
  publishOptimisticChange();
  closeTransactionSurface?.();
}
