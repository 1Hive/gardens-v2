"use client";
import React, { useEffect, useState } from "react";
import { ChartSetup } from "./ChartSetup";
import { ChartWrapper } from "./ChartWrapper";
import type { EChartsOption } from "echarts";

export const ActivePointsChart = () => {
  const [data, setData] = useState([
    { value: 70, name: "Points Active" },
    { value: 30, name: "Points Inactive" },
  ]);

  const OPTIONS: EChartsOption = {
    // TODO: check show state
    // yAxis: { show: false },
    // xAxis: { show: false },

    series: [
      {
        name: "Points distribution",
        type: "pie",
        radius: "90%",
        data: data,
      },
    ],
  };

  return (
    <>
      <ChartWrapper title="Points distribution">
        <ChartSetup options={OPTIONS} />
      </ChartWrapper>
    </>
  );
};
