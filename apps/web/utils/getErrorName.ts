import { useEffect } from "react";
import { BaseError, ContractFunctionRevertedError } from "viem";

export function getErrorName(error: Error | null ) {
  let errorName = undefined;
  let args = undefined;

  if (error instanceof BaseError) {
    const revertError = error.walk(err => err instanceof ContractFunctionRevertedError);
    if (revertError instanceof ContractFunctionRevertedError) {
      errorName = revertError.data?.errorName ?? '';
      args = revertError.data?.args;
      // do something with `errorName`
      console.log("OKSMDOKSAMD", errorName);
    }
  }
  return {errorName, args};
}

export default function useErrorDetails(error: Error | null, name?: string) {

  const {errorName, args} = getErrorName(error);
  
  useEffect(() => {
    if (!error) return;

    const {errorName, args} = getErrorName(error);
    console.log(name??'errorName', errorName);
  }
  , [error]);
  
  return {errorName, args};
}