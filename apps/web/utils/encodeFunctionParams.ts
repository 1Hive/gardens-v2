import {
  Abi,
  AbiFunctionNotFoundError,
  AbiItem,
  GetAbiItemParameters,
  getAbiItem,
} from "viem";
import { encodeAbiParameters } from "viem/utils";

export const encodeFunctionParams = function (
  abi: Abi,
  functionName: string,
  args: readonly unknown[] = [],
) {
  let abiItem = abi[0] as AbiItem;

  if (functionName) {
    abiItem = getAbiItem({
      abi,
      args,
      name: functionName,
    } as GetAbiItemParameters);

    if (!abiItem) {
      throw new AbiFunctionNotFoundError(functionName, {
        docsPath: "/docs/contract/encodeFunctionData",
      });
    }
  }

  if (abiItem.type !== "function") {
    throw new AbiFunctionNotFoundError(undefined, {
      docsPath: "/docs/contract/encodeFunctionData",
    });
  }
  const data =
    "inputs" in abiItem && abiItem.inputs
      ? encodeAbiParameters(abiItem.inputs, (args ?? []) as readonly unknown[])
      : undefined;
  return data;
};
