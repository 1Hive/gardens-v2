import React from "react";
import { NavBar } from "@/components";
import { Abi } from "viem";
import { encodeFunctionParams } from "@/utils/encodeFunctionParams";
import CVStrategyABI from "#/contracts/out/CVStrategy.sol/CVStrategy.json";

export default function layout({ children }: { children: React.ReactNode }) {
  const abi = CVStrategyABI.abi as Abi;
  const functionName = "supportProposal";
  const args = [
    [
      [1, -10],
      [2, 30],
    ],
  ];

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
