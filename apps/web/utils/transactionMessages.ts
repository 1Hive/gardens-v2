export const getTxMessage = (transactionStatus: string | undefined) => {
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
      message = "User rejected the request";
      break;
  }
  return message;
};
