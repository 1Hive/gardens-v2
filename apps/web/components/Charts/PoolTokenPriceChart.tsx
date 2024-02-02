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
        data: ["12", 10, 8, 7, 11, 10.5, 9.4],
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
      <ChartWrapper title="Funding Token Price" size="sm">
        <ChartSetup options={OPTION_TEST} />
      </ChartWrapper>
    </>
  );
};
