"use client";
import React from "react";
import { ChartSetup } from "./ChartSetup";
import { ChartWrapper } from "./ChartWrapper";
import type { EChartsOption } from "echarts";
import EChartsReact from "echarts-for-react";

export const ConvictionBarChart = ({
  data,
  currentConviction,
  threshold,
  proposalSupport,
  maxConviction,
}: {
  data?: any;
  currentConviction: number;
  threshold: number;
  proposalSupport: number;
  maxConviction: number;
}) => {
  // console.log(data);
  // console.log(proposalSupport);

  // const { currentConviction, futureConviction, thresholdPoints, pointsNeeded } =
  //   data;

  console.log("currentConviction", currentConviction);
  console.log("threshold", threshold);
  console.log("proposalSupport", proposalSupport);
  console.log("maxConviction", maxConviction);

  const futureConviction = (maxConviction as number) - currentConviction;
  console.log("futureConviction", futureConviction);

  const pointsNeeded = 225;

  const OPTION_TEST: EChartsOption = {
    tooltip: {
      trigger: "axis",
      axisPointer: {
        type: "shadow",
      },
    },
    legend: {},
    grid: {
      left: "5%",
      right: "4%",
      bottom: "3%",
      containLabel: true,
    },
    xAxis: {
      type: "value",
    },
    yAxis: {
      type: "category",
      data: ["Proposal"],
    },

    barWidth: "20%",

    series: [
      {
        name: "Conviction",
        type: "bar",
        stack: "total",
        color: "#0569FA",

        showBackground: false,

        label: {
          show: false,
          formatter: "CV: {@score} pts",
          fontSize: 10,
          color: "white",
          ellipsis: "...",
          // fontWeight: "",
        },
        emphasis: {
          focus: "series",
        },
        data: [20],
      },
      {
        name: "Future Convcition",
        type: "bar",
        stack: "total",
        itemStyle: {
          borderRadius: [0, 20, 20, 0],
        },
        color: "#0496DE",
        showBackground: true,
        backgroundStyle: {
          color: "rgb(93, 143, 216, 0.1)",
          // borderRadius: [20, 20, 0, 0],
        },
        //   itemStyle:{
        //   borderRadius: 20
        // },

        label: {
          show: false,
        },
        emphasis: {
          focus: "series",
        },
        data: [futureConviction],
      },
      {
        name: "Support",
        type: "bar",
        stack: "points",
        color: "#05FA81",
        itemStyle: {
          borderRadius: [0, 20, 20, 0],
        },
        // markLine: {
        //   data: [{ type: 'max', name: 'max' }]
        // },
        label: {
          show: false,
          formatter: "{a}: {@score} pts",
          fontSize: 10,
          // fontWeight: "",
          color: "black",
        },
        emphasis: {
          focus: "series",
        },

        data: [proposalSupport],
      },
      {
        name: "Points Needed",
        type: "bar",
        stack: "points",

        color: "rgb(205, 250, 225, 0.3)",
        showBackground: true,
        backgroundStyle: {
          // borderRadius: [0, 20, 20, 0],
        },

        label: {
          show: true,
          formatter: "{a}: {@score}",
          fontSize: 12,
          // fontWeight: "",
          // fontFamily: "",
          color: "black",
        },
        emphasis: {
          focus: "series",
        },
        data: [175],
        markLine: {
          data: [{ type: "max", name: "threshold" }],
          lineStyle: {
            width: 1,
            color: "#5D8FD8",
          },
        },
      },
    ],
  };

  // animationEasing: "elasticOut"
  return (
    <ChartWrapper title="" size="lg">
      <EChartsReact option={OPTION_TEST} />
    </ChartWrapper>
  );
};
