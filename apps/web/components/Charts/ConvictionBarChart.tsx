"use client";
import React from "react";
import { ChartWrapper } from "./ChartWrapper";
import type { EChartsOption, MarkLineComponentOption } from "echarts";
import EChartsReact from "echarts-for-react";

type ScenarioMapping = {
  condition: () => boolean;
  details: [{ message: string; growing: boolean | null }];
};

type ConvictionBarChartProps = {
  currentConvictionPct: number;
  thresholdPct: number;
  proposalSupportPct: number;
  isSignalingType: boolean;
  compact?: boolean;
};

export const ConvictionBarChart = ({
  currentConvictionPct,
  thresholdPct,
  proposalSupportPct,
  isSignalingType,
  compact,
}: ConvictionBarChartProps) => {
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
    convictionLTThresholdLTSupport: {
      condition: () =>
        currentConvictionPct < thresholdPct &&
        thresholdPct < proposalSupportPct,
      details: [
        {
          // TODO: add real date
          message: "This proposal will pass",
          growing: true,
        },
      ],
    },
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
          // TODO: add real date
          message: "This proposal is Executable",
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
    message:
      proposalSupportPct == 0
        ? "Proposal waiting for support ..."
        : "Scenario not found",
    growing: null,
  };

  console.log(message);

  const SupportGtConv = proposalSupportPct > currentConvictionPct;
  const ConvEqSupport = proposalSupportPct == currentConvictionPct;
  const maxValue = Math.max(
    proposalSupportPct,
    currentConvictionPct,
    thresholdPct,
  );

  const widthLabel = (param: number) => {
    const relativeWidth = (param / maxValue) * 100;
    return relativeWidth;
  };

  //console.log(widthLabel(0.1));

  const emphasis = {
    disabled: true,
  };

  const markLine: MarkLineComponentOption = {
    symbol: "none",
    label: {
      position: "start",
      formatter: "{@score} %",
      fontSize: compact ? 10 : 16,
    },
  };

  const markLineTh: MarkLineComponentOption =
    isSignalingType || compact
      ? {}
      : {
          ...markLine,
          data: [
            {
              xAxis: thresholdPct,
              symbol:
                "path://M3 3v1.5M3 21v-6m0 0 2.77-.693a9 9 0 0 1 6.208.682l.108.054a9 9 0 0 0 6.086.71l3.114-.732a48.524 48.524 0 0 1-.005-10.499l-3.11.732a9 9 0 0 1-6.085-.711l-.108-.054a9 9 0 0 0-6.208-.682L3 4.5M3 15V4.5",
              symbolSize: [16, 16],
              symbolOffset: [-7, 53],
            },
          ],
          // label: {
          //   // distance: 0,
          // },
          lineStyle: {
            width: 1,
            color: "#191919",
            dashOffset: 30,
          },
          z: 50,
        };

  const markLineCv: MarkLineComponentOption =
    // currentConvictionPct === 0
    //   ? {}
    {
      ...markLine,
      // data: [
      //   {
      //     xAxis: currentConvictionPct,
      //   },
      // ],
      data: [
        {
          xAxis: 4,
        },
      ],
      lineStyle: {
        width: 2,
        color: "#69db7c",
        type: "solid",
      },
    };

  const option: EChartsOption = {
    emphasis: emphasis,
    yAxis: {
      // TODO: ADD proposal title
      data: ["Proposal #1"],
      axisTick: { show: false },
      axisLabel: {
        formatter: "",
      },
      axisLine: {
        show: false,
      },
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
      max: maxValue,
    },
    tooltip: {
      trigger: compact ? "axis" : "none",
      valueFormatter: (value) => value + "%",
      borderWidth: 1,
      borderColor: "#191919",
      axisPointer: {
        type: "shadow",
      },
    },

    grid: {
      show: false,
      left: "0%",
      right: "1.5%",
      top: compact ? "0%" : "25%",
      bottom: compact ? "0%" : "25%",
      containLabel: false,
    },

    animationDurationUpdate: 1200,
    barGap: "-100%",
    series: [
      {
        type: "bar",
        name: "Support",
        itemStyle: {
          color: "#9EE157",
          borderRadius: [20, 20, 20, 20],
        },
        label: {
          show: !compact ?? false,
          position: "insideRight",
          color: "#191919",
          fontSize: 14,
          formatter: "{@score} %",
        },
        z: SupportGtConv ? 1 : ConvEqSupport ? 1 : 2,
        barWidth: 23,
        data: [proposalSupportPct],
      },
      {
        type: "bar",
        name: "Conviction",
        itemStyle: {
          color: "#65AD18",
          borderRadius: [20, 20, 20, 20],
        },
        // labelLayout: {
        //   width: 200,
        //   draggable: true,
        // },
        label: {
          show: !compact ?? false,
          //show: false,
          position: "inside",
          color: "#ffff",
          fontSize: 14,
          formatter: "{@score} %",
          //padding: [0, 50, 0, 50],

          //overflow: "truncate",
          //width: widthLabel(0.1),
          width: 0,

          // borderColor: "#191919",
          // borderWidth: 1,
        },
        barWidth: 23,
        z: 1,
        data: [currentConvictionPct],
        //markLine: markLineCv,
      },
      {
        type: "bar",
        name: !isSignalingType ? "Threshold" : "",
        barWidth: 23,
        data: [thresholdPct],
        itemStyle: {
          borderRadius: [20, 20, 20, 20],
        },
        color: "#e9ecef",
        z: 0,
        markLine: {
          ...markLineTh,
        },
      },
    ],
  };

  return (
    <>
      {compact ? (
        <EChartsReact
          option={option}
          style={{ height: "100%", width: "100%" }}
        />
      ) : (
        <ChartWrapper message={message} growing={growing}>
          <EChartsReact
            option={option}
            style={{ height: "100%", width: "100%" }}
          />
        </ChartWrapper>
      )}
    </>
  );
};
