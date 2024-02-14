"use client";
import React, { useEffect, useMemo, useState } from "react";
import { ChartSetup } from "./ChartSetup";
import { ChartWrapper } from "./ChartWrapper";
import type { EChartsOption } from "echarts";

type ActivePointsChartProps = {
  stakedPoints: number;
};

const defaultData = [{ value: 100, name: "Points Inactive" }];

//Active:  Staked vs Unstaked Points for Member
export const ActivePointsChart = ({
  stakedPoints = 0,
}: ActivePointsChartProps) => {
  const [data, setData] = useState(defaultData);

  const chartData = useMemo(() => {
    const activeStakedPoints = stakedPoints || 0;
    const inactivePoints = 100 - activeStakedPoints;

    return [
      { value: activeStakedPoints, name: "Staked" },
      { value: inactivePoints, name: "Not Staked" },
    ];
  }, [stakedPoints]);

  useEffect(() => {
    setData(chartData);
  }, [chartData]);

  const OPTIONS: EChartsOption = {
    series: [
      {
        name: "Points distribution",
        type: "pie",
        radius: "80%",
        data: data,
      },
    ],
  };

  return (
    <>
      <ChartWrapper title="">
        <ChartSetup options={OPTIONS} />
      </ChartWrapper>
    </>
  );
};
