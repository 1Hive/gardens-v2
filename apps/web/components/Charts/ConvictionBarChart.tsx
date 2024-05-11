"use client";
import React from "react";
import { ChartSetup } from "./ChartSetup";
import { ChartWrapper } from "./ChartWrapper";
import type { EChartsOption } from "echarts";
import EChartsReact from "echarts-for-react";

type ScenarioMapping = {
  condition: () => boolean;
  details: [{ message: string; growing: boolean }];
};

export const ConvictionBarChart = ({
  currentConviction,
  threshold,
  proposalSupport,
}: {
  currentConviction: number;
  threshold: number;
  proposalSupport: number;
  maxConviction?: number;
}) => {
  const supportNeeded = (threshold - proposalSupport).toFixed(2);

  const scenarioMappings: Record<string, ScenarioMapping> = {
    //1) Conviction < Total Support < Threshold --- working ...
    convictionLTSupportLTThreshold: {
      condition: () =>
        currentConviction < proposalSupport && proposalSupport < threshold,
      details: [
        {
          message: `This proposal needs ${supportNeeded} % more support to reach threshold`,
          growing: true,
        },
      ],
    },
    //2) Conviction < Threshold < Total Support --- working ...
    convictionLTThresholdLTSupport: {
      condition: () =>
        currentConviction < threshold && threshold < proposalSupport,
      details: [
        {
          message: "This proposal will pass within X days ...",
          growing: true,
        },
      ],
    },
    //3) Total Support < Conviction < Threshold
    supportLTConvictionLTThreshold: {
      condition: () =>
        proposalSupport < currentConviction && currentConviction < threshold,
      details: [
        {
          message: `This proposal needs ${supportNeeded} % more support to reach threshold`,
          growing: false,
        },
      ],
    },
    //4) Total Support < Threshold < Conviction
    supportLTThresholdLTConviction: {
      condition: () =>
        proposalSupport < threshold && threshold < currentConviction,
      details: [
        {
          message: "This proposal is Executable until X date",
          growing: false,
        },
      ],
    },
    //5) Threshold < Conviction < Total Support
    thresholdLTConvictionLTSupport: {
      condition: () =>
        threshold < currentConviction && currentConviction < proposalSupport,
      details: [
        {
          message: "This proposal is ready to be executed !",
          growing: true,
        },
      ],
    },
    //6) Threshold < Total Support < Conviction
    thresholdLTSupportLTConviction: {
      condition: () =>
        threshold < proposalSupport && proposalSupport < currentConviction,
      details: [
        {
          message: "This proposal is ready to be executed!",
          growing: false,
        },
      ],
    },
  };

  const { message, growing } = Object.values(scenarioMappings).find(
    ({ condition }) => condition(),
  )?.details[0] ?? {
    details: "Proposal waiting for support ...",
    growing: null,
  };

  const emphasis = {
    itemStyle: {
      shadowBlur: 5,
      shadowColor: "rgba(0,0,0,0.3)",
      focus: "series",
    },
  };

  const option: EChartsOption = {
    yAxis: {
      data: ["cv"],
      axisTick: { show: false },
      axisLabel: {
        formatter: "",
      },
      axisLine: {
        show: false,
      },
    },
    legend: {},
    grid: {
      show: false,
      left: "0%",
      right: "5%",
      top: "35%",
      bottom: "30%",
      containLabel: true,
    },
    xAxis: {
      splitLine: { show: false },
      axisLabel: {
        formatter: "{value}%",
        fontSize: 10,
      },
      axisLine: {
        show: false,
      },
    },
    animationDurationUpdate: 1200,
    barGap: "-77%",
    series: [
      {
        type: "bar",
        name: "Support",
        emphasis: emphasis,
        stack: "a",
        itemStyle: {
          color: "#b2f2bb",
        },
        barWidth: 40,
        z: 20,
        data: [proposalSupport],
      },
      {
        type: "bar",
        name: "Conviction",
        label: {
          show: currentConviction > 0 ? true : false,
          position: "inside",
          formatter: "{c}%",
          fontSize: 12,
          fontStyle: "italic",
          color: "black",
        },
        emphasis: emphasis,
        itemStyle: {
          color: "#69db7c",
        },
        silent: true,
        barWidth: 20,
        z: 30,
        data: [currentConviction],
      },
      {
        type: "bar",
        name: "threshold",
        stack: "a",
        emphasis: emphasis,
        barWidth: 40,
        z: 10,
        data: [Number(supportNeeded) < 0 ? 0 : threshold - proposalSupport],
        color: "#e9ecef",
        markLine: {
          symbol: "none",
          data: [
            {
              xAxis: threshold,

              label: {
                formatter: "Threshold: {@score}%",
                fontSize: 15,
                color: "#8C8C8C",
                fontWeight: "bold",
              },
            },
          ],

          lineStyle: {
            width: 2,
            color: "#8C8C8C",
          },
        },
      },
    ],
  };

  return (
    <>
      <ChartWrapper
        title={"Proposal Conviction Chart"}
        message={message}
        growing={growing}
      >
        <EChartsReact option={option} />
      </ChartWrapper>
    </>
  );
};
