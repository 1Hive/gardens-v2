import { UserRejectedRequestError } from "viem";

export function isUserRejectedTransactionError(error: unknown) {
  const seen = new Set<unknown>();
  let current = error;

  while (current != null && typeof current === "object" && !seen.has(current)) {
    if (current instanceof UserRejectedRequestError) return true;

    const errorLike = current as {
      cause?: unknown;
      code?: number | string;
    };
    if (errorLike.code === 4001 || errorLike.code === "ACTION_REJECTED") {
      return true;
    }

    seen.add(current);
    current = errorLike.cause;
  }

  return false;
}

export const getTxMessage = (
  transactionStatus: string | undefined,
  transactionError?: Error | null | undefined,
  fallbackErrorMessage?: string,
) => {
  let message = "";
  switch (transactionStatus) {
    case "idle":
      message = "";
      break;
    case "waiting":
      message = "Waiting for signature...";
      break;
    case "loading":
      message = "Transaction in progress...";
      break;
    case "success":
      message = "Confirmed";
      break;
    case "error":
      message =
        transactionError ?
          parseErrorMessage(transactionError, fallbackErrorMessage)
        : "Error processing transaction";
      break;
  }
  return message;
};

function parseErrorMessage(error: Error, fallbackErrorMessage?: string) {
  if (isUserRejectedTransactionError(error)) {
    return "User rejected the request";
  } else if (fallbackErrorMessage) {
    return fallbackErrorMessage;
  } else {
    return "Transaction failed\nPlease report a bug";
  }
}
