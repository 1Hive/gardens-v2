import { AbiFunction } from "abitype";
import { Abi } from "viem";
import {
  alloABI,
  cvStrategyABI,
  erc20ABI,
  passportScorerABI,
  registryCommunityABI,
  registryFactoryABI,
  safeABI,
} from "@/src/generated";

const FuncFilterError = (item: { type: string }) => item.type === "error";

// merge abi errors
const errorsABI = [
  ...alloABI.filter(FuncFilterError),
  ...cvStrategyABI.filter(FuncFilterError),
  ...registryCommunityABI.filter(FuncFilterError),
  ...registryFactoryABI.filter(FuncFilterError),
  ...erc20ABI.filter(FuncFilterError),
  ...safeABI.filter(FuncFilterError),
  ...passportScorerABI.filter(FuncFilterError),
];

// console.log("errorsABI", errorsABI);

export function abiWithErrors<TAbi extends Abi>(abi: TAbi) {
  return [...abi, ...errorsABI];
}

export function filterFunctionFromABI<
  TAbi extends Abi,
  TAbiItem extends TAbi[number] & AbiFunction,
>(abi: TAbi, selector: (abiItem: TAbiItem) => boolean): TAbi {
  const filtered = abi.filter((abiItem) => {
    if (abiItem.type !== "function") return false;
    return selector(abiItem as TAbiItem);
  }) as unknown as TAbi;
  return filtered;
}
