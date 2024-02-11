import React from "react";
import { ChartSetup } from "./ChartSetup";
import { ChartWrapper } from "./ChartWrapper";
import type { EChartsOption } from "echarts";

//Pool Token Price fluctuation over days ? weeks ? monthes ?
//In this example is month with mock data
export const PoolTokenPriceChart = () => {
  const OPTION_TEST: EChartsOption = {
    xAxis: {
      type: "category",
      data: ["Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb"],
      boundaryGap: false,
    },
    yAxis: {
      type: "value",
    },
    series: [
      {
        data: ["0", 0, 0, 0, 0, 1800, 1000],
        type: "line",
        //line view more "swingy"
        smooth: true,
        //blue are
        areaStyle: {},
      },
    ],
  };

  return (
    <>
      <ChartWrapper title="Tokens in Pool" size="sm">
        <ChartSetup options={OPTION_TEST} />
      </ChartWrapper>
    </>
  );
};
