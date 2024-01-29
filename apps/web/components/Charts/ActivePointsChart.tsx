"use client";
import React, { FC } from "react";
import type { EChartsOption } from "echarts";
import EChartsReact from "echarts-for-react";
import { useTheme } from "next-themes";
import cn from "classnames";

export const ActivePointsChart = ({ options }: { options: any }) => {
  const { resolvedTheme } = useTheme();

  const option = {
    // title: {
    //   text: "Referer of a Website",
    //   subtext: "Fake Data",
    //   left: "center",
    // },
    tooltip: {
      trigger: "item",
    },
    legend: {
      orient: "h",
      right: "left",
    },
    emphasis: {
      itemStyle: {
        shadowBlur: 10,
        shadowOffsetX: 0,
        shadowColor: "rgba(0, 0, 0, 0.5)",
      },
    },
    series: [
      {
        name: "Points distribution",
        type: "pie",
        radius: "90%",
        data: [
          { value: 66, name: "Active points" },
          { value: 44, name: "Inactive point" },
        ],
      },
    ],
  };

  return (
    <ChartWrap title="Points distribution">
      <EChartsReact option={option} style={{ height: "100%", width: "100%" }} />
    </ChartWrap>
  );
};

//handle the size + ... ?
//TODO set the exacts types
//TODO set offical styles

type ChartWrapProps = {
  children?: any;
  size?: "sm" | "md" | "lg";
  title: string;
};
const ChartWrap = ({ children, size = "md", title }: ChartWrapProps) => {
  return (
    <>
      <div className="flex flex-col gap-0 overflow-hidden rounded-lg rounded-t-lg">
        <div
          className={cn({
            "h-8 md:h-20 lg:h-40": size === "sm",
            "h-10 md:h-24 lg:h-64": size === "md",
            "h-10 md:h-24 lg:h-72": size === "lg",
          })}
        >
          {children}
        </div>
        <header className="w-full bg-primary p-1 text-center font-semibold text-black last:rounded-b-lg">
          {title}
        </header>
      </div>
    </>
  );
};
