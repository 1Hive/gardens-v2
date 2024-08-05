import { UserRejectedRequestError } from "viem";

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
      message = "Approved";
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
  console.debug(error);
  if (error?.cause instanceof UserRejectedRequestError) {
    return "User rejected the request";
  } else if (fallbackErrorMessage) {
    return fallbackErrorMessage;
  } else {
    return "Transaction failed. Please try again";
  }
}
