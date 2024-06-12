"use client";
import React from "react";
import { ChartWrapper } from "./ChartWrapper";
import type { EChartsOption, MarkLineComponentOption } from "echarts";
import EChartsReact from "echarts-for-react";

type ScenarioMapping = {
  condition: () => boolean;
  details: [{ message: string; growing: boolean | null }];
};

export const ConvictionBarChart = ({
  currentConvictionPct,
  thresholdPct,
  proposalSupportPct,
  isSignalingType,
}: {
  currentConvictionPct: number;
  thresholdPct: number;
  proposalSupportPct: number;
  isSignalingType: boolean;
}) => {
  console.log(
    "proposalSupportPct: " + proposalSupportPct,
    "currentConvictionPct: " + currentConvictionPct,
    "thresholdPct: " + thresholdPct,
  );

  const supportNeeded = (thresholdPct - proposalSupportPct).toFixed(2);
  const scenarioMappings: Record<string, ScenarioMapping> = {
    //1-SignalingType) Support > 0 && > Conviction
    isSignalingTypeAndCovictionEqSupport: {
      condition: () =>
        isSignalingType &&
        proposalSupportPct !== 0 &&
        proposalSupportPct > currentConvictionPct,
      details: [
        {
          message: "",
          growing: true,
        },
      ],
    },
    //2-SignalingType) Support > 0 && < Conviction
    isSignalingTypeAndCovictionGtSupport: {
      condition: () =>
        isSignalingType &&
        proposalSupportPct !== 0 &&
        proposalSupportPct < currentConvictionPct,
      details: [
        {
          message: "",
          growing: false,
        },
      ],
    },
    //1) Conviction < Total Support < Threshold --- working ...
    convictionLTSupportLTThreshold: {
      condition: () =>
        currentConvictionPct < proposalSupportPct &&
        proposalSupportPct < thresholdPct,
      details: [
        {
          message: `This proposal needs ${supportNeeded} % more support to reach ${thresholdPct}%`,
          growing: true,
        },
      ],
    },
    //2) Conviction < Threshold < Total Support --- working ...
    // convictionLTThresholdLTSupport: {
    //   condition: () =>
    //     currentConvictionPct < thresholdPct && thresholdPct < proposalSupportPct,
    //   details: [
    //     {
    //       message: "This proposal will pass within X days ...",
    //       growing: true,
    //     },
    //   ],
    // },
    //3) Total Support < Conviction < Threshold
    supportLTConvictionLTThreshold: {
      condition: () =>
        proposalSupportPct < currentConvictionPct &&
        currentConvictionPct < thresholdPct,
      details: [
        {
          message: `This proposal needs ${supportNeeded} % more support to reach ${thresholdPct}%`,
          growing: false,
        },
      ],
    },
    //4) Total Support < Threshold < Conviction
    supportLTThresholdLTConviction: {
      condition: () =>
        proposalSupportPct < thresholdPct &&
        thresholdPct < currentConvictionPct,
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
        thresholdPct < currentConvictionPct &&
        currentConvictionPct < proposalSupportPct,
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
        thresholdPct < proposalSupportPct &&
        proposalSupportPct < currentConvictionPct,
      details: [
        {
          message: "This proposal is ready to be executed!",
          growing: false,
        },
      ],
    },
    //7) Conviction = Total Support  < Threshold
    CovictionEqSupportLTthreshold: {
      condition: () =>
        proposalSupportPct == currentConvictionPct &&
        proposalSupportPct !== 0 &&
        proposalSupportPct < thresholdPct,
      details: [
        {
          message: `This proposal needs ${supportNeeded} % more support to reach ${thresholdPct}%`,
          growing: null,
        },
      ],
    },
    //8) Conviction = Total Support  > Threshold
    CovictionEqSupportGTthreshold: {
      condition: () =>
        proposalSupportPct == currentConvictionPct &&
        proposalSupportPct !== 0 &&
        proposalSupportPct > thresholdPct,
      details: [
        {
          message: `This proposal is ready to be executed!`,
          growing: null,
        },
      ],
    },
  };

  const { message, growing } = Object.values(scenarioMappings).find(
    ({ condition }) => condition(),
  )?.details[0] ?? {
    message: proposalSupportPct == 0 ? "Proposal waiting for support ..." : "",
    growing: null,
  };

  const emphasis = {
    disabled: true,
  };

  const markLine: MarkLineComponentOption = {
    symbol: "none",
    label: {
      position: "start",
      formatter: "{@score} %",
      fontSize: 16,
    },
  };

  const markLineTh: MarkLineComponentOption = isSignalingType
    ? {}
    : {
        ...markLine,
        data: [
          {
            xAxis: thresholdPct,
            symbol:
              "path://M3 3v1.5M3 21v-6m0 0 2.77-.693a9 9 0 0 1 6.208.682l.108.054a9 9 0 0 0 6.086.71l3.114-.732a48.524 48.524 0 0 1-.005-10.499l-3.11.732a9 9 0 0 1-6.085-.711l-.108-.054a9 9 0 0 0-6.208-.682L3 4.5M3 15V4.5",
            symbolSize: [20, 20],
            symbolOffset: [-9, 95],
          },
        ],
        lineStyle: {
          width: 2,
          color: "#191919",
        },
      };

  const markLineCv: MarkLineComponentOption =
    currentConvictionPct === 0
      ? {}
      : {
          ...markLine,
          data: [
            {
              xAxis: currentConvictionPct,
            },
          ],
          lineStyle: {
            width: 2,
            color: "#69db7c",
            type: "solid",
          },
        };

  const option: EChartsOption = {
    title: {
      text: "Conviction voting chart",
    },
    emphasis: emphasis,
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
    legend: {
      itemGap: 35,
      selectedMode: false,
      textStyle: {
        fontSize: 13,
      },
      data: [
        {
          name: "Support",
          icon: "rect",
        },
        {
          name: "Conviction",
          icon: "rect",
        },
        {
          name: "Threshold",
          icon: "rect",
          itemStyle: {
            color: "none",
            borderType: "dashed",
            borderColor: "#191919",
            borderWidth: 2,
          },
        },
      ],
    },
    toolbox: {
      feature: {
        saveAsImage: { show: true },
      },
    },
    grid: {
      show: false,
      left: "5%",
      right: "5%",
      top: "35%",
      bottom: "35%",
      containLabel: true,
    },
    xAxis: {
      splitLine: { show: false },
      axisLabel: {
        show: false,
        formatter: "{value}%",
        fontSize: 10,
      },
      axisLine: {
        show: false,
      },
    },
    animationDurationUpdate: 1200,
    barGap: "-69%",
    series: [
      {
        type: "bar",
        name: "Support",
        stack: "a",
        label: {
          show: true,
          position: proposalSupportPct === 0 ? [2, -14] : "top",
          color: "#191919",
          fontSize: 12,
          formatter: "{a}: {@score} %",
        },
        itemStyle: {
          color: "#b2f2bb",
        },
        barWidth: 50,
        data: [proposalSupportPct],
      },
      {
        type: "bar",
        name: "Conviction",
        itemStyle: {
          color: "#69db7c",
        },
        barWidth: 20,
        data: [currentConvictionPct],
        markLine: markLineCv,
      },
      {
        type: "bar",
        name: !isSignalingType ? "Threshold" : "",
        stack: "a",
        barWidth: 50,
        data: [
          Number(supportNeeded) < 0 ? 0 : thresholdPct - proposalSupportPct,
        ],
        color: "#e9ecef",
        z: -10,
        markLine: {
          ...markLineTh,
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
