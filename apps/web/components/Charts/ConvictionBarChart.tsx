"use client";

import React from "react";
import type { EChartsOption, MarkLineComponentOption } from "echarts";
import EChartsReact from "echarts-for-react";
import { ChartWrapper } from "./ChartWrapper";

type ScenarioMapping = {
  condition: () => boolean;
  details: [{ message: string; growing: boolean | null }];
};

type ConvictionBarChartProps = {
  currentConvictionPct: number;
  thresholdPct: number;
  proposalSupportPct: number;
  isSignalingType: boolean;
  proposalId: number;
  compact?: boolean;
};

export const ConvictionBarChart = ({
  currentConvictionPct,
  thresholdPct,
  proposalSupportPct,
  isSignalingType,
  proposalId,
  compact,
}: ConvictionBarChartProps) => {
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
          message: "This proposal is ready to be executed!",
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
          message: "This proposal is ready to be executed!",
          growing: null,
        },
      ],
    },
  };

  const { message, growing } = Object.values(scenarioMappings).find(
    ({ condition }) => condition(),
  )?.details[0] ?? {
    message:
      proposalSupportPct == 0 ?
        "Proposal waiting for support"
      : "Scenario not found",
    growing: null,
  };

  const supportGtConv = proposalSupportPct > currentConvictionPct;
  const convEqSupport = proposalSupportPct === currentConvictionPct;
  const maxValue = Math.max(
    proposalSupportPct,
    currentConvictionPct,
    thresholdPct,
  );

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
    isSignalingType ?
      {}
    : {
        ...markLine,
        data: [
          {
            xAxis: thresholdPct,
            symbol:
              "path://M3 3v1.5M3 21v-6m0 0 2.77-.693a9 9 0 0 1 6.208.682l.108.054a9 9 0 0 0 6.086.71l3.114-.732a48.524 48.524 0 0 1-.005-10.499l-3.11.732a9 9 0 0 1-6.085-.711l-.108-.054a9 9 0 0 0-6.208-.682L3 4.5M3 15V4.5",
            symbolSize: [16, 16],
            symbolOffset: [-7, 50],
          },
        ],
        lineStyle: {
          width: compact ? 0.5 : 1,
          color: "#191919",
          dashOffset: 30,
        },
        z: 50,
      };
  const option: EChartsOption = {
    emphasis: emphasis,
    yAxis: {
      data: [`Proposal #${proposalId}`],
      axisTick: { show: false },

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
      trigger: "axis",
      valueFormatter: (value) => value + "%",
      borderWidth: 1,
      borderColor: "#65AD18",
      backgroundColor: "#FCFFF7",
      axisPointer: {
        type: "none",
      },
    },
    grid: {
      show: false,
      left: "0%",
      right: "2%",
      top: compact ? "0%" : "25%",
      bottom: compact ? "0%" : "25%",
      containLabel: false,
    },
    animation: true,
    barGap: "-100%",
    series: [
      {
        type: "bar",
        name: "Support",
        itemStyle: {
          color: "#A8E066",
          borderRadius: [20, 20, 20, 20],
        },
        showBackground: true,
        backgroundStyle: {
          color: "#F0F0F0",
          borderRadius: [20, 20, 20, 20],
        },
        label: {
          show: !compact ?? false,
          position: "insideRight",
          color: "#191919",
          fontSize: 10,
          formatter: "{@score} %",
        },
        z:
          supportGtConv ? 1
          : convEqSupport ? 1
          : 2,
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
        label: {
          show: !compact ?? false,
          position: "insideRight",
          color: "#FFFFFF",
          fontSize: 10,
          formatter: "{@score} %",
          width: 0,
        },
        barWidth: 23,
        z: 1,
        data: [currentConvictionPct],
      },
      isSignalingType ?
        {}
      : {
          type: "bar",
          name: "Threshold",
          barWidth: 23,
          data: [thresholdPct],
          itemStyle: {
            borderRadius: [20, 20, 20, 20],
            color: "#EEEEEE",
          },
          color: "#EEEEEE",
          z: 0,
          markLine: {
            ...markLineTh,
          },
        },
    ],
  };

  return (
    <>
      {compact ?
        <EChartsReact
          option={option}
          style={{ height: "100%", width: "100%" }}
        />
      : <ChartWrapper
          message={message}
          growing={growing}
          isSignalingType={isSignalingType}
        >
          <EChartsReact
            option={option}
            style={{ height: "100%", width: "100%" }}
          />
        </ChartWrapper>
      }
    </>
  );
};
