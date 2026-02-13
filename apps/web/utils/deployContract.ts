import { Abi, Address } from "viem";
import "viem/window";
import { createWalletClient, custom } from "viem";
import { localhost } from "viem/chains";

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
    transport: custom(window.ethereum!),
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

  console.info("hash", hash);
  return data;
};
