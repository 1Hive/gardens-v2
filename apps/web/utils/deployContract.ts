import { extractAddr } from "#/subgraph/src/scripts/last-addr";
import {
  Abi,
  AbiFunctionNotFoundError,
  AbiItem,
  Address,
  GetAbiItemParameters,
  getAbiItem,
} from "viem";
import { publicClient } from "@/configs/wagmiConfig";

import { createWalletClient, custom } from "viem";
import { arbitrumSepolia, localhost, mainnet, sepolia } from "viem/chains";

import cvStrategyJson from "../../../pkg/contracts/out/CVStrategy.sol/CVStrategy.json" assert { type: "json" };

type CVStrategyJson = typeof cvStrategyJson;

export const deployContract = async function (
  account: Address,
): Promise<Address | undefined> {
  let data: Address = "0x";
  let cvStrategyJsonTyped: CVStrategyJson = cvStrategyJson;
  let bytecode = cvStrategyJsonTyped.bytecode.object as Address;

  const client = createWalletClient({
    chain: localhost,
    transport: custom(window.ethereum),
  });

  const abi: Abi = [
    {
      inputs: [],
      stateMutability: "nonpayable",
      type: "constructor",
    },
  ];

  const hash = await client.deployContract({
    abi,
    account,
    bytecode,
  });

  console.log("hash", hash);
  return data;
};
