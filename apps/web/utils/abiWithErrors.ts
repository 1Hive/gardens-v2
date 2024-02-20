import {
  cvStrategyABI,
  registryCommunityABI,
  registryFactoryABI,
  alloABI,
  erc20ABI,
} from "@/src/generated";
import { Abi } from "viem";

const FuncFilterError = (item: { type: string }) => item.type === "error";

// merge abi errors
const errorsABI = [
  ...alloABI.filter(FuncFilterError),
  ...cvStrategyABI.filter(FuncFilterError),
  ...registryCommunityABI.filter(FuncFilterError),
  ...registryFactoryABI.filter(FuncFilterError),
  ...erc20ABI.filter(FuncFilterError),
];

// console.log("errorsABI", errorsABI);

export function abiWithErrors(abi: Abi): Abi {
  return [...abi, ...errorsABI];
}
