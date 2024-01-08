import allo from "@/constants/contracts/Allo.json";
import CVStrategyABI_ from "#/contracts/out/CVStrategy.sol/CVStrategy.json";

export const alloContract = allo;
export const CVStrategyABI = CVStrategyABI_;

export const contractsAddresses = {
  allo: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0" as `0x${string}`,
  strategy: "0xB7f8BC63BbcaD18155201308C8f3540b07f84F5e" as `0x${string}`,
  registryGardens:
    "0x61c36a8d610163660E21a8b7359e1Cac0C9133e1" as `0x${string}`,
  registry: "0x5FbDB2315678afecb367f032d93F642f64180aa3" as `0x${string}`,
};
