"use client";

import React, { useMemo } from "react";
import type { EChartsOption, TooltipComponentOption } from "echarts";
import EChartsReact from "echarts-for-react";

export const ChartSetup = ({ options }: { options?: EChartsOption }) => {
  const DEFAULT_OPTIONS: {
    tooltip: TooltipComponentOption;
    emphasis: {
      itemStyle: {
        shadowBlur: number;
        shadowOffsetX: number;
        shadowColor: string;
      };
    };
  } = {
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
        tooltip:
          options?.tooltip ?
            (options?.tooltip as TooltipComponentOption)
          : DEFAULT_OPTIONS.tooltip,
        // legend: {
        //   ...DEFAULT_OPTIONS["legend"],
        //   ...(options?.legend ?? {}),
        // },
        xAxis: options?.xAxis ?? { show: false },
        yAxis: options?.yAxis ?? { show: false },
        series: processedSeries,
      }}
      style={{ height: "100%", width: "100%" }}
    />
  );
};
