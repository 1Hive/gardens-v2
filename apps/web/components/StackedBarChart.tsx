import React from "react";

type StackedBarChart = {
  type: "funding" | "streaming" | "signaling";
  cvPoints: number;
  supportingPoints: number;
  neededPoints?: number;
  threshold?: number;
  streamingPoints?: number;
  deadLine?: Date;
};

export function StackedBarChart({
  type,
  cvPoints,
  supportingPoints,
  neededPoints,
  threshold,
  streamingPoints,
  deadLine,
}: StackedBarChart) {
  const calculatePercentage = (value: number, total: number) => {
    const result = (value * 100) / total;
    if (result > 100) return 100;
    return Math.round(result);
  };

  return (
    <div className="flex w-full flex-col gap-8 p-6">
      <div className="flex flex-col gap-1 font-bold">
        <div className="flex gap-2">
          <div className="h-4 w-8 rounded-md bg-green-700"></div>
          <span>Current conviction</span>
        </div>
        <div className="flex gap-2">
          <div className="h-4 w-8 rounded-md bg-green-500"></div>
          <span>Future conviction</span>
        </div>
        <div className="flex gap-2">
          <div className="h-4 w-8 rounded-md bg-gray-300"></div>
          <span>Conviction needed</span>
        </div>
      </div>
      <div className="my-6 flex flex-col gap-3">
        <div className="relative">
          {/* {threshold && neededPoints && (

          )} */}
          {/* <div className="flex h-12 text-sm font-bold "> */}
          <div className="h-14 rounded-xl border-2 border-black p-[6px] text-sm font-bold">
            {threshold && neededPoints && (
              <div className="relative  flex h-full">
                <div
                  className="absolute -top-[14px] h-[70px] w-px border-r-[3px] border-dashed border-black"
                  style={{
                    left: `calc(${calculatePercentage(
                      threshold,
                      threshold,
                    )}% - 3px)`,
                  }}
                ></div>
                <div
                  className={`flex h-full items-center justify-center bg-green-700 text-white`}
                  style={{
                    width: `${calculatePercentage(cvPoints, threshold)}%`,
                  }}
                >
                  {calculatePercentage(cvPoints, threshold) > 5 && Math.round(cvPoints)}
                </div>
                <div
                  className={`flex h-full items-center justify-center bg-green-500 text-white`}
                  style={{
                    width: `${calculatePercentage(
                      supportingPoints - cvPoints,
                      threshold,
                    )}%`,
                  }}
                >
                  {calculatePercentage(supportingPoints - cvPoints, threshold) >
                    5 && Math.round(supportingPoints - cvPoints)}
                </div>
                <div
                  className={`flex h-full items-center justify-center bg-gray-300`}
                  style={{
                    width: `${calculatePercentage(neededPoints, threshold)}%`,
                  }}
                >
                  {calculatePercentage(neededPoints, threshold) > 5 &&
                    Math.round(neededPoints)}
                </div>
              </div>
            )}
          </div>
        </div>
        <span className="font-bold">
          {type === "funding" && neededPoints ? `${Math.round(neededPoints)} more conviction points needed` : ""}
        </span>
      </div>
    </div>
  );
}
