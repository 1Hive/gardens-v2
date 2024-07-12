import type { EChartsOption } from "echarts";
import EChartsReact from "echarts-for-react";
import React from "react";
import { ChartWrapper } from "./ChartWrapper";

//Total Amount of points staked in each proposal within all Stakers / Members

type Proposals = {
  value: number;
  name: string;
};
type ProposalTotalStakedChartProps = {
  proposals: Proposals[];
};
const truncateText = (text: string, maxWords: number): string => {
  const words = text.split(" ");
  return (
    words.slice(0, maxWords).join(" ") + (words.length > maxWords ? " ..." : "")
  );
};

export const ProposalTotalStakedChart = ({
  proposals,
}: ProposalTotalStakedChartProps) => {
  const xAxisData = proposals.map((proposal) => truncateText(proposal.name, 2));
  const seriesData = proposals.map((proposal) => proposal.value);
  const OPTION_TEST: EChartsOption = {
    tooltip: {
      trigger: "axis",
      axisPointer: {
        type: "shadow",
      },
    },

    grid: {
      left: "3%",
      right: "4%",
      bottom: "20%",
      containLabel: true,
    },
    xAxis: {
      type: "value",
      boundaryGap: [0, 2],
    },
    yAxis: {
      type: "category",
      data: xAxisData,
    },
    series: [
      {
        name: "2012",
        type: "bar",
        data: seriesData,
      },
    ],
  };
  return (
    <ChartWrapper title="Proposals Total Support (tokens)" size="md">
      <EChartsReact option={OPTION_TEST} />
    </ChartWrapper>
  );
};
