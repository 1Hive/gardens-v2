import React from "react";
import { NavBar } from "@/components";
import {
  Abi,
  AbiFunctionNotFoundError,
  AbiItem,
  GetAbiItemParameters,
  getAbiItem,
} from "viem";

import CVStrategyABI from "#/contracts/out/CVStrategy.sol/CVStrategy.json";
import { encodeAbiParameters } from "viem/utils";

export default function layout({ children }: { children: React.ReactNode }) {
  const abi = CVStrategyABI.abi as Abi;
  const functionName = "supportProposal";
  const args = [[[1, -10]]];

  const data = encodeFunctionParams(abi, functionName, args);

  console.log(data);

  return (
    <>
      <NavBar />
      <main className="mx-6 my-10">{children}</main>
      {/* footer */}
    </>
  );
}
function encodeFunctionParams(
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
}
