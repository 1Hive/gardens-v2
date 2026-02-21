"use client";

import React, { useEffect, useMemo, useState } from "react";
import type { EChartsOption, MarkLineComponentOption } from "echarts";
import EChartsReact from "echarts-for-react";
import { ChartWrapper } from "./ChartWrapper";
import { Countdown } from "../Countdown";
import { Skeleton } from "../Skeleton";
import { useTheme } from "@/providers/ThemeProvider";

type ScenarioMapping = {
  condition: () => boolean;
  details: [{ message: string; growing: boolean | null }];
};

type ConvictionBarChartProps = {
  currentConvictionPct: number;
  thresholdPct: number;
  proposalSupportPct: number;
  isSignalingType: boolean;
  proposalNumber: number;
  compact?: boolean;
  timeToPass?: number;
  defaultChartMaxValue?: boolean;
  proposalStatus: string;
  proposalType: "funding" | "streaming" | "signaling";
  onReadyToExecute?: () => void;
  refreshConviction?: () => Promise<any>;
};

export function getChartColors(isDarkTheme?: boolean) {
  return {
    background:
      isDarkTheme ? "rgba(48, 48, 48, 0.55)" : "rgba(180, 180, 180, 0.2)",
    support: isDarkTheme ? "#88b358" : "#65AD18",
    conviction: isDarkTheme ? "#3f8f65" : "#74c898",
    threshold:
      isDarkTheme ? "rgba(79, 161, 118, 0.35)" : "rgba(150, 211, 105, 0.45)",
    markLine: isDarkTheme ? "#E8E8E8" : "#191919",
    label: isDarkTheme ? "#F5F5F5" : "#191919",
    tooltipBorder: isDarkTheme ? "#4FA176" : "#65AD18",
    tooltipBackground: isDarkTheme ? "#1E1E1E" : "#FCFFF7",
    tooltipText: isDarkTheme ? "#F3F4F6" : "#191919",
  };
}

const ConvictionBarChartBase = ({
  currentConvictionPct,
  thresholdPct,
  proposalSupportPct,
  isSignalingType,
  proposalNumber,
  compact,
  timeToPass,
  onReadyToExecute,
  defaultChartMaxValue = false,
  proposalStatus,
  proposalType,
}: ConvictionBarChartProps) => {
  const [convictionRefreshing, setConvictionRefreshing] = useState(true);
  const { resolvedTheme } = useTheme();
  const isDarkTheme = resolvedTheme === "darkTheme";
  const chartColors = getChartColors(isDarkTheme);
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
    //1) Conviction < Total Support < Threshold
    convictionLTSupportLTThreshold: {
      condition: () =>
        currentConvictionPct < proposalSupportPct &&
        proposalSupportPct < thresholdPct,
      details: [
        {
          message: `This proposal needs ${supportNeeded} VP more support to reach ${thresholdPct} VP threshold.`,
          growing: true,
        },
      ],
    },
    // 2) Conviction < Threshold < Total Support
    convictionLTThresholdLTSupport: {
      condition: () =>
        currentConvictionPct < thresholdPct &&
        thresholdPct < proposalSupportPct,
      details: [
        {
          message: "",
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
          message: `This proposal needs ${supportNeeded} VP more support to reach ${thresholdPct} VP threshold.`,
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
          message: `This proposal needs ${supportNeeded} VP more support to reach ${thresholdPct} VP threshold.`,
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
    //9) Conviction = Threshold  < Support
    ConvictionEqThresholdLTSupport: {
      condition: () =>
        thresholdPct == currentConvictionPct &&
        proposalSupportPct !== 0 &&
        proposalSupportPct > thresholdPct,
      details: [
        {
          message: "This proposal needs conviction to grow!",
          growing: true,
        },
      ],
    },
  };

  const { message, growing } = useMemo(() => {
    return (
      Object.values(scenarioMappings).find(({ condition }) => condition())
        ?.details[0] ?? {
        message:
          proposalSupportPct === 0 ?
            "Proposal waiting for support"
          : "Scenario not found",
        growing: null,
      }
    );
  }, [timeToPass, currentConvictionPct, proposalSupportPct, thresholdPct]);

  useEffect(() => {
    if (convictionRefreshing && currentConvictionPct != null) {
      setConvictionRefreshing(false);
    }
  }, [convictionRefreshing, currentConvictionPct]);

  const supportGtConv = proposalSupportPct > currentConvictionPct;
  const convEqSupport = proposalSupportPct === currentConvictionPct;

  const emphasis = {
    disabled: true,
  };

  const borderRadius = defaultChartMaxValue ? [50, 50] : [50, 0, 0, 50];

  const markLine: MarkLineComponentOption = {
    symbol: "none",
    label: {
      position: "start",
      formatter: "{@score} VP",
      fontSize: compact ? 10 : 14,
      color: chartColors.label,
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
          width: compact ? 0.75 : 1,
          color: chartColors.markLine,
          dashOffset: 30,
        },
        z: 50,
      };

  const chartMaxValue =
    defaultChartMaxValue ?
      Math.max(currentConvictionPct, proposalSupportPct, thresholdPct)
    : 100;

  const option: EChartsOption = {
    emphasis: emphasis,
    yAxis: {
      data: [`Proposal #${proposalNumber}`],
      axisTick: { show: false },

      axisLine: {
        show: false,
      },
    },
    xAxis: {
      splitLine: { show: false },
      axisLabel: {
        show: false,
        formatter: "{value } VP",
        fontSize: 8,
      },
      axisLine: {
        show: false,
      },
      max: chartMaxValue,
    },
    tooltip: {
      trigger: "axis",
      valueFormatter: (value) => value + " VP",
      borderWidth: 1,
      borderColor: chartColors.tooltipBorder,
      backgroundColor: chartColors.tooltipBackground,
      textStyle: {
        color: chartColors.tooltipText,
      },
      axisPointer: {
        type: "none",
      },
    },
    grid: {
      show: false,
      left: "0%",
      right: compact ? "0%" : "4%",
      top: compact ? "0%" : "25%",
      bottom: compact ? "0%" : "25%",
      containLabel: false,
    },
    animation: true,
    barGap: "-100%",
    series: [
      {
        showBackground: true,
        backgroundStyle: {
          color: chartColors.background,
          borderRadius: [50, 50],
        },
        type: "bar",
        name: "Support",
        itemStyle: {
          color: chartColors.support,
          borderRadius: borderRadius,
        },

        label: {
          show: !compact,
          position: "insideRight",
          color: chartColors.label,
          fontSize: 8,
          formatter: "{@score } VP",
        },
        z:
          supportGtConv ? 1
          : convEqSupport ? 1
          : 2,
        barWidth: 18,
        data: [proposalSupportPct],
      },
      {
        type: "bar",
        name: "Conviction",
        itemStyle: {
          color: chartColors.conviction,
          borderRadius: borderRadius,
        },
        label: {
          show: !compact,
          position: "insideRight",
          color: "#FFFFFF",
          fontSize: 8,
          formatter: "{@score } VP",
          width: 0,
        },
        barWidth: 18,
        z: 1,
        data: [currentConvictionPct],
      },
      isSignalingType ?
        {}
      : {
          type: "bar",
          name: "Threshold",
          barWidth: 18,
          data: [thresholdPct],
          itemStyle: {
            borderRadius: borderRadius,
            color: chartColors.threshold,
          },
          color: chartColors.threshold,
          z: 0,
          markLine: {
            ...markLineTh,
          },
        },
    ],
  };

  const readyToBeExecuted = currentConvictionPct >= thresholdPct;
  const proposalWillPass =
    Number(supportNeeded) < 0 &&
    (currentConvictionPct ?? 0) < (thresholdPct ?? 0);

  const chart = (
    <>
      <Skeleton isLoading={convictionRefreshing}>
        <EChartsReact
          option={option}
          style={{ height: "100%", width: "100%" }}
          className="cursor-default"
        />
      </Skeleton>

      {/* <Button
        btnStyle="link"
        onClick={handleRefreshConviction}
        tooltip="Refresh conviction"
        className={!compact ? "border2" : ""}
      >
        <ArrowPathIcon className="w-5" />
      </Button> */}
    </>
  );

  return (
    <>
      {compact ?
        chart
      : <>
          <ChartWrapper
            message={isSignalingType ? undefined : message}
            growing={growing}
            isSignalingType={isSignalingType}
            proposalStatus={proposalStatus}
            support={proposalSupportPct}
            threshold={thresholdPct}
            conviction={currentConvictionPct}
          >
            {chart}
          </ChartWrapper>
          {scenarioMappings.supportLTConvictionLTThreshold != null &&
            proposalWillPass &&
            !readyToBeExecuted && (
              <div className="flex items-center gap-2">
                <p>
                  {proposalType === "funding" ?
                    "Estimated time to pass"
                  : "Before stream start"}
                  :
                </p>
                <Countdown
                  endTimestamp={Number(timeToPass)}
                  display="inline"
                  showTimeout={false}
                  onTimeout={onReadyToExecute}
                />
              </div>
            )}
        </>
      }
    </>
  );
};

function areConvictionBarChartPropsEqual(
  prev: ConvictionBarChartProps,
  next: ConvictionBarChartProps,
) {
  return (
    prev.currentConvictionPct === next.currentConvictionPct &&
    prev.thresholdPct === next.thresholdPct &&
    prev.proposalSupportPct === next.proposalSupportPct &&
    prev.isSignalingType === next.isSignalingType &&
    prev.proposalNumber === next.proposalNumber &&
    prev.compact === next.compact &&
    prev.timeToPass === next.timeToPass &&
    prev.defaultChartMaxValue === next.defaultChartMaxValue &&
    prev.proposalStatus === next.proposalStatus &&
    prev.proposalType === next.proposalType
  );
}

export const ConvictionBarChart = React.memo(
  ConvictionBarChartBase,
  areConvictionBarChartPropsEqual,
);
