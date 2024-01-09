import React from "react";

// type StackedBarChart = Funding | Streaming | Signaling;

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
  // let totalPoints: number;
  // if (type === "funding"){
  //   totalPoints = threshold;
  // }

  const calculatePercentage = (value: number, total: number) => {
    const result = (value * 100) / total;

    if (result > 100) return 100;
    return Math.round(result);
  };

  console.log(
    type,
    cvPoints,
    supportingPoints,
    neededPoints,
    threshold,
    streamingPoints,
    deadLine,
  );

  return (
    <div className="flex w-full flex-col gap-8 p-6">
      <div className="flex flex-col gap-1 font-bold">
        <div className="flex gap-2">
          <div className="h-4 w-8 rounded-md bg-green-700"></div>
          <span>Conviction points</span>
        </div>
        <div className="flex gap-2">
          <div className="h-4 w-8 rounded-md bg-green-500"></div>
          <span>Supporting points</span>
        </div>
        <div className="flex gap-2">
          <div className="h-4 w-8 rounded-md bg-gray-300"></div>
          <span>Points needed</span>
        </div>
      </div>
      <div className="my-6 flex flex-col gap-3">
        <div className="relative flex h-12 overflow-clip rounded-xl border-2 border-black text-sm font-bold ">
          {threshold && neededPoints && (
            <>
              <div
                className={`flex h-full items-center justify-center bg-green-700 text-white`}
                style={{
                  width: `${calculatePercentage(cvPoints, threshold)}%`,
                }}
              >
                {calculatePercentage(cvPoints, threshold) > 5 && cvPoints}
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
                  5 && supportingPoints}
              </div>
              <div
                className={`flex h-full items-center justify-center bg-gray-300`}
                style={{
                  width: `${calculatePercentage(neededPoints, threshold)}%`,
                }}
              >
                {calculatePercentage(neededPoints, threshold) > 5 &&
                  neededPoints}
              </div>
            </>
          )}
        </div>
        <span className="font-bold">
          {type === "funding" ? `${neededPoints} more points needed` : ""}
        </span>
      </div>
    </div>
  );
}
