"use client";

import React, { useMemo } from "react";
import type { EChartsOption } from "echarts";
import EChartsReact from "echarts-for-react";

export const ChartSetup = ({ options }: { options?: EChartsOption }) => {
  const DEFAULT_OPTIONS = {
    tooltip: {
      trigger: "item",
    },
    //TODO: see if legend is neccesary
    // legend: {
    //   orient: "h",
    //   right: "right",
    // },
    emphasis: {
      itemStyle: {
        shadowBlur: 10,
        shadowOffsetX: 0,
        shadowColor: "rgba(0, 0, 0, 0.5)",
      },
    },
  };

  const processedSeries = useMemo(
    () =>
      // @ts-ignore
      options?.series?.map((series: { data: unknown[] }) => {
        const { data } = series;
        let newData = data;

        return {
          ...series,
          data: newData,
        };
      }),
    [options],
  );

  return (
    <EChartsReact
      option={{
        ...DEFAULT_OPTIONS,
        tooltip: {
          ...DEFAULT_OPTIONS["tooltip"],
          ...(options?.tooltip ?? {}),
        },
        // legend: {
        //   ...DEFAULT_OPTIONS["legend"],
        //   ...(options?.legend ?? {}),
        // },
        xAxis: {
          ...DEFAULT_OPTIONS,
          ...(options?.xAxis ?? { show: false }),
        },
        yAxis: {
          ...(options?.yAxis ?? { show: false }),
        },
        series: processedSeries,
      }}
      style={{ height: "100%", width: "100%" }}
    />
  );
};
