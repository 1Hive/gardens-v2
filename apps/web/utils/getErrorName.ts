import { useEffect } from "react";
import { BaseError, ContractFunctionRevertedError } from "viem";

export function getErrorName(error: Error | null) {
  let errorName = undefined;
  let args = undefined;
  if (error instanceof BaseError) {
    const revertError = error.walk(
      (err) => err instanceof ContractFunctionRevertedError,
    );
    if (revertError instanceof ContractFunctionRevertedError) {
      errorName = revertError.data?.errorName ?? "";
      args = revertError.data?.args;
      // do something with `errorName`
    }
  }
  return { errorName, args };
}

export function useErrorDetails(error: Error | null, name?: string) {
  const { errorName, args } = getErrorName(error);

  useEffect(() => {
    if (errorName) {
      console.error(name ? `ErrorDetails:${name}` : "errorName", errorName);
    }
  }, [errorName]);

  return { errorName, args };
}
