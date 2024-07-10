"use client";
import React, { useEffect, useMemo, useState } from "react";
import { ChartSetup } from "./ChartSetup";
import { ChartWrapper } from "./ChartWrapper";
import type { EChartsOption } from "echarts";

export type Proposals = {
  name: string;
  value: number;
  valueBigInt?: bigint;
};
type ProposalDistributionPointsChartProps = {
  proposals: Proposals[];
};
const defaultData: Proposals[] = [{ value: 100, name: "Unsopported Points" }];

//Total Amount of points distributed in proposals by Staker / Member

export const ProposalDistributionPointsChart = ({
  proposals,
}: ProposalDistributionPointsChartProps) => {
  const [data, setData] = useState(defaultData);

  const chartData = useMemo(() => {
    // Calculate the sum of all values from proposals
    const sumOfProposalValues = proposals.reduce(
      (total, proposal) =>
        Number(total) + Number(BigInt(proposal.value).toString()),
      0,
    );
    // Calculate the initial difference
    const unstakePoints = 100 - sumOfProposalValues;

    const TotalPointsDistribution = [
      ...proposals,
      {
        value: Number(BigInt(unstakePoints) / BigInt(10 ** 4)),
        name: "Unsupported Points",
      },
    ];

    return TotalPointsDistribution;
  }, [proposals]);

  useEffect(() => {
    setData(chartData);
  }, [chartData]);

  const OPTION_TEST: EChartsOption = {
    series: [
      {
        name: "Access From",
        type: "pie",
        radius: "70%",
        data: data,
      },
    ],
  };
  return (
    <ChartWrapper>
      <ChartSetup options={OPTION_TEST} />
    </ChartWrapper>
  );
};
