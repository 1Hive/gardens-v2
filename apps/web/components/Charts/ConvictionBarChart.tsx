"use client";
import React from "react";
import { ChartSetup } from "./ChartSetup";
import { ChartWrapper } from "./ChartWrapper";
import type { EChartsOption } from "echarts";
import EChartsReact from "echarts-for-react";

type ScenarioMapping = {
  condition: () => boolean;
  data: number[];
};

export const ConvictionBarChart = ({
  data,
  currentConviction,
  threshold,
  proposalSupport,
}: {
  data?: any;
  currentConviction: number;
  threshold: number;
  proposalSupport: number;
  maxConviction?: number;
}) => {
  console.log("currentConviction", currentConviction);
  console.log("threshold", Number(threshold));
  console.log("proposalSupport", proposalSupport);

  const maxConviction = (proposalSupport - currentConviction).toFixed(2);
  const convictionNeeded = (threshold - proposalSupport).toFixed(2);

  const isSupportGtThreshold = proposalSupport > threshold;

  console.log(maxConviction);

  const scenarioMappings: Record<string, ScenarioMapping> = {
    //1) Conviction < Total Support < Threshold --- working ...
    convictionLTSupportLTThreshold: {
      condition: () =>
        currentConviction < proposalSupport && proposalSupport < threshold,
      data: [
        currentConviction,
        proposalSupport - currentConviction,
        parseFloat((threshold - proposalSupport).toFixed(2)),
        threshold,
      ],
    },
    //2) Conviction < Threshold < Total Support --- working ...
    convictionLTThresholdLTSupport: {
      condition: () =>
        currentConviction < threshold && threshold < proposalSupport,
      data: [currentConviction, Number(maxConviction), 0, threshold],
    },
    //3) Total Support < Conviction < Threshold
    supportLTConvictionLTThreshold: {
      condition: () =>
        proposalSupport < currentConviction && currentConviction < threshold,
      data: [
        currentConviction,
        0,
        parseFloat((threshold - currentConviction).toFixed(2)),
        threshold,
      ],
    },
    //4) Total Support < Threshold < Conviction
    supportLTThresholdLTConviction: {
      condition: () =>
        proposalSupport < threshold && threshold < currentConviction,
      data: [currentConviction, 0, threshold - proposalSupport, threshold],
    },
    //5) Threshold < Conviction < Total Support
    thresholdLTConvictionLTSupport: {
      condition: () =>
        threshold < currentConviction && currentConviction < proposalSupport,
      data: [
        currentConviction,
        Number((proposalSupport - currentConviction).toFixed(2)),
        0,
        threshold,
      ],
    },
    //6) Threshold < Total Support < Conviction
    thresholdLTSupportLTConviction: {
      condition: () =>
        threshold < proposalSupport && proposalSupport < currentConviction,
      data: [
        currentConviction,
        proposalSupport - currentConviction,
        0,
        threshold,
      ],
    },
  };

  let scenario: string | undefined = Object.keys(scenarioMappings).find(
    (scenarioKey) => scenarioMappings[scenarioKey].condition(),
  );

  const seriesData = scenario
    ? scenarioMappings[scenario].data
    : [currentConviction, maxConviction, convictionNeeded, threshold];

  console.log("series data", seriesData);

  const OPTION_TEST: EChartsOption = {
    tooltip: {
      trigger: "axis",
      show: true,
      axisPointer: {
        type: "shadow",
      },
    },
    legend: {
      data: [
        "Current Conviction",
        "Max Conviction",
        "Support Needed",
        "Threshold",
      ],
    },
    grid: {
      show: false,
      left: "10%",
      right: "10%",
      bottom: "3%",
      containLabel: false,
    },
    xAxis: {
      type: "value",
      boundaryGap: [0, 0],
    },
    yAxis: {
      type: "category",
      data: [""],
    },
    barWidth: "30%",

    // series: [
    //   {
    //     name: "Current Conviction",
    //     type: "bar",
    //     stack: "total",
    //     data: [seriesData[0]],
    //     color: "#65AD18",
    //     label: {
    //       show: true,
    //       formatter: "{@score}%",
    //       fontSize: 16,
    //       color: "black",
    //     },
    //   },
    //   {
    //     name: "Max Conviction",
    //     type: "bar",
    //     stack: "total",
    //     data: [seriesData[1]],
    //     color: "#9EE157",
    //     label: {
    //       show: seriesData[1] > 0,
    //       formatter: "{@score}%",
    //       fontSize: 16,
    //     },
    //     markLine: {
    //       data: [
    //         {
    //           xAxis: proposalSupport,
    //           label: {
    //             formatter: "Support: {@score}% ",
    //             fontSize: 12,
    //           },
    //         },
    //       ],
    //       lineStyle: {
    //         width: 2,
    //         color: "#023535",
    //       },
    //     },
    //   },
    //   {
    //     name: "Support Needed",
    //     type: "bar",
    //     stack: "total",
    //     data: [0],
    //     color: "#EEEEEE",
    //     label: {
    //       show: !isSupportGtThreshold ? true : false,

    //       formatter: "{@score}%",
    //       fontSize: 16,
    //       color: "black",
    //     },
    //   },
    //   {
    //     name: "",
    //     type: "bar",
    //     stack: "total",
    //     data: [seriesData[3]],
    //     color: "white",
    //     markLine: {
    //       data: [
    //         {
    //           xAxis: threshold,
    //           label: {
    //             formatter: "Threshold: {@score}%",
    //             fontSize: 14,
    //           },
    //         },
    //       ],
    //       lineStyle: {
    //         width: 2,
    //         color: "#FC4100",
    //       },
    //     },
    //   },
    // ],

    series: [
      // CURRENT CONVICTION
      {
        name: "Current Conviction",
        data: [seriesData[0]],
        type: "bar",
        stack: "x",
        color: "#65AD18",

        showBackground: false,
        backgroundStyle: {
          // color: "rgb(100, 100, 216, 1)",
        },
        itemStyle: {
          // borderRadius: [0, 20, 20, 0],
        },
        label: {
          show: currentConviction > 0 ? true : false,
          formatter: "{@score}%",
          fontSize: 16,
          color: "black",
          ellipsis: "...",
          // fontWeight: "",
        },
        emphasis: {
          focus: "series",
        },
      },
      //MAX CONVICTION
      {
        name: "Max Conviction",
        data: [seriesData[1]],
        type: "bar",
        stack: "x",
        itemStyle: {
          // borderRadius: [0, 20, 20, 0],
        },
        color: "#9EE157",
        // color: 'rgb(100, 100, 216, 1)',
        showBackground: false,
        backgroundStyle: {
          // borderRadius: [0, 20, 20, 0],
          // color:"red",
          // color: "rgb(205, 250, 225, 0.3)",
          // color: "rgb(93, 143, 216, 0.1)",
          // borderRadius: [20, 20, 0, 0],
        },
        //   itemStyle:{
        //   borderRadius: 20
        // },

        label: {
          show: Number(maxConviction) > 0 ? true : false,
          formatter: "{@score}%",
          fontSize: 16,
        },
        emphasis: {
          focus: "series",
        },

        markLine: {
          data: [
            {
              xAxis: proposalSupport, // formula for that too, total supported
              label: {
                formatter: "Support: {@score}% ",
                fontSize: 12,
                color: "#023535",
                //fontWeight: "600",
              },
            },
          ],

          lineStyle: {
            width: 2,
            color: "#023535",
          },
        },
      },
      //SUPPORT NEEDED
      {
        name: "Support Needed",
        data: [seriesData[2]], // here can be zero
        type: "bar",
        stack: "x",

        color: "#EEEEEE",

        // showBackground: false,
        // backgroundStyle: {

        // },
        itemStyle: {
          //borderRadius: [0, 20, 20, 0],
        },
        label: {
          show: isSupportGtThreshold ? false : true,

          formatter: "{@score}%", // if total supported is greater then threshold that shoulkd be empty
          // sum up current + total - threshold
          fontSize: 16,
          color: "black",
        },
        emphasis: {
          focus: "series",
        },
      },
      //THRESHOLD
      {
        name: "", //Empty to show Threshold
        type: "bar",
        stack: "x",
        color: "white",
        label: {
          show: false,
        },
        emphasis: {
          focus: "series",
        },
        markLine: {
          data: [
            {
              xAxis: threshold, // formula for that too, always the threshold
              label: {
                formatter: "Threshold: {@score}%",
                fontSize: 14,
                color: "#FC4100",
                //fontWeight: "600",
              },
            },
          ],
          lineStyle: {
            width: 2,
            color: "#FC4100",
          },
        },
      },
    ],
  };

  // animationEasing: "elasticOut"
  return (
    <ChartWrapper title={"Proposal Conviction Chart"} size="lg">
      <EChartsReact option={OPTION_TEST} />
    </ChartWrapper>
  );
};
