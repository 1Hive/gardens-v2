"use client";
import React, { FC, useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { ProposalTotalStakedChart } from "./Charts";
import { ProposalDistributionPointsChart } from "./Charts";
import { Proposals } from "./Charts/ProposalDistributionPointsChart";
import { ProposalTypeVoter } from "./Proposals";

type ProposalStatsProps = {
  proposals: ProposalTypeVoter[];
  distributedPoints: bigint;
};

export const ProposalStats: FC<ProposalStatsProps> = ({
  proposals,
  distributedPoints,
}) => {
  // console.log("proposals", proposals);
  const proposalsDistributionPoints = proposals.map(
    ({ title, voterStakedPointsPct }) => {
      // console.log("voterStakedPointsPct", voterStakedPointsPct);
      return {
        value: Number(BigInt(voterStakedPointsPct).toString()),
        name: title,
      };
    },
  ) as Proposals[];

  const proposalsTotalSupport = proposals.map(({ title, stakedTokens }) => ({
    value: stakedTokens,
    name: title,
  }));

  return (
    <div className="w-full space-y-8 p-2">
      <h4 className="text-center font-bold">Proposals Metrics</h4>
      <div className="flex w-full items-center justify-between gap-12">
        <div className="flex-1">
          <ProposalTotalStakedChart proposals={proposalsTotalSupport} />
        </div>
        <div className="flex-1 ">
          <ProposalDistributionPointsChart
            proposals={proposalsDistributionPoints}
          />
        </div>
      </div>
    </div>
  );
};
