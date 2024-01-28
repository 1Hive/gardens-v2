import {
  cvStrategyAbi,
  registryCommunityAbi,
  registryFactoryAbi,
  alloAbi,
} from "@/src/generated";
import { Abi } from "viem";

const FuncFilterError = (item: { type: string }) => item.type === "error";

// merge abi errors
const errorsABI = [
  ...alloAbi.filter(FuncFilterError),
  ...cvStrategyAbi.filter(FuncFilterError),
  ...registryCommunityAbi.filter(FuncFilterError),
  ...registryFactoryAbi.filter(FuncFilterError),
];
// console.log("errorsABI", errorsABI);

export function abiWithErrors(abi: Abi): Abi {
  return [...abi, ...errorsABI];
}
