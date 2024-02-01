import React, { FC } from "react";
import { useAccount, useContractReads } from "wagmi";
import { registryCommunityAbi, cvStrategyAbi, alloAbi } from "@/src/generated";

type ProposalStatsProps = {
  strategyAddress: `0x${string}`;
  proposals: any[];
};

export const ProposalStats: FC<ProposalStatsProps> = ({
  strategyAddress,
  proposals,
}) => {
  const { address: mainConnectedAccount } = useAccount();

  const strategyContract = {
    address: strategyAddress,
    abi: cvStrategyAbi,
    functionName: "getProposalStakedAmount",
  } as const;

  const proposalsId = proposals.map((proposals) => proposals.id);

  const result = useContractReads({
    contracts: [
      { ...strategyContract, args: [3n] },
      { ...strategyContract, args: [2n] },
      { ...strategyContract, args: [1n] },
    ],
  });

  console.log(result.data);

  //   console.log("strategyAdd", strategyAddress);
  //   console.log("proposals", proposals);

  return (
    <div className="border2 w-full space-y-8 p-2">
      <h4 className="text-center font-bold">Proposals Metrics</h4>
      <div className="flex w-full items-center justify-between gap-4 border-2">
        <div className="border2 flex-1">graph 1</div>
        <div className="border2 flex-1 ">graph 2</div>
      </div>
    </div>
  );
};
