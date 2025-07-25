"use client";

import React, { FC } from "react";
import {
  ProposalDistributionPointsChart,
  ProposalTotalStakedChart,
} from "./Charts";
import { Proposals } from "./Charts/ProposalDistributionPointsChart";
import { ProposalTypeVoter } from "./Proposals";

type ProposalStatsProps = {
  proposals: ProposalTypeVoter[];
  distributedPoints: number;
};

export const ProposalStats: FC<ProposalStatsProps> = ({ proposals }) => {
  const proposalsDistributionPoints = proposals.map(({ title }) => {
    return {
      value: 0,
      name: title,
    };
  }) as Proposals[];

  const proposalsTotalSupport = proposals.map(({ title }) => ({
    value: 0,
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
