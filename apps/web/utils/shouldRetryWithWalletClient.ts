import {
  BaseError,
  CallExecutionError,
  TimeoutError,
  TransactionExecutionError,
} from "viem";

export const shouldRetryWithWalletClient = (error: unknown) => {
  const transportError = [
    error instanceof Error ? error.message : undefined,
    (error as { cause?: { message?: string } })?.cause?.message,
    (error as { details?: string })?.details,
  ]
    .filter(Boolean)
    .join("\n");

  if (
    /HTTP request failed|Failed to fetch|fetch failed|NetworkError|Load failed/i.test(
      transportError,
    )
  ) {
    return true;
  }

  // Wagmi simulates the contract through the public RPC before asking the
  // wallet to send it. A timeout in that read is safe to fall back from; a
  // timeout during submission could already have broadcast the transaction.
  return (
    error instanceof BaseError &&
    error.walk((cause) => cause instanceof CallExecutionError) instanceof
      CallExecutionError &&
    error.walk((cause) => cause instanceof TimeoutError) instanceof
      TimeoutError &&
    !(
      error.walk(
        (cause) => cause instanceof TransactionExecutionError,
      ) instanceof TransactionExecutionError
    )
  );
};
