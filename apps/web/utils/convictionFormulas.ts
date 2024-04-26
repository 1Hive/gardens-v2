import * as dn from "dnum";
import { formatTokenAmount } from "./numbers";

function validateInput(input: any) {
  return Number.isInteger(Number(input));
}

export const calcThresholdPct = (
  threshold: number | bigint,
  maxCVSupply: number | bigint,
  tokenDecimals: number,
): string | number => {
  const thresholdPct = dn.divide(threshold, maxCVSupply, tokenDecimals);

  const formatThresholdPct =
    Number(dn.format(thresholdPct, { digits: 4 })) * 100;

  return formatThresholdPct;
};

//TODO: calc in % the rest of formulas
export const calcCurrentConviction = (
  convictionLast: number | bigint,
  maxCVSupply: number | bigint,
  totalEffectiveActivePoints: number | bigint,
): number | Error => {
  if (
    !validateInput(convictionLast) ||
    !validateInput(maxCVSupply) ||
    !validateInput(totalEffectiveActivePoints) ||
    convictionLast < 0 ||
    maxCVSupply <= 0 ||
    totalEffectiveActivePoints < 0
  ) {
    return 0;
  }
  if (maxCVSupply <= convictionLast) {
    throw new Error(
      "Invalid input. maxCVSupply must be greater than convictionLast.",
    );
  }

  const convictionLastPct = Number(convictionLast) / Number(maxCVSupply);
  const result = convictionLastPct * Number(totalEffectiveActivePoints) * 2;
  return Math.floor(result);
};

export const calcMaxConviction = (
  maxCVStaked: number | bigint,
  maxCVSupply: number | bigint,
  totalEffectiveActivePoints: number | bigint,
): number | Error => {
  if (
    !validateInput(maxCVStaked) ||
    !validateInput(maxCVSupply) ||
    !validateInput(totalEffectiveActivePoints) ||
    maxCVStaked < 0 ||
    maxCVSupply <= 0 ||
    totalEffectiveActivePoints < 0
  ) {
    throw new Error(
      "Invalid input. All parameters must be non-negative integers.",
    );
  }
  if (maxCVSupply === 0 || maxCVStaked === 0) {
    return 0;
    // throw new Error(
    //   "Invalid input. maxCVSupply and maxCVStaked must be non-zero.",
    // );
  }
  const futureConvictionStakedPct = Number(maxCVStaked) / Number(maxCVSupply);
  const result =
    futureConvictionStakedPct * Number(totalEffectiveActivePoints) * 2;
  return Math.floor(result);
};

export const calcFutureConviction = (
  convictionLast: number | bigint,
  maxCVStaked: number | bigint,
  maxCVSupply: number | bigint,
  totalEffectiveActivePoints: number | bigint,
): number | Error => {
  const currentConviction = calcCurrentConviction(
    convictionLast,
    maxCVSupply,
    totalEffectiveActivePoints,
  );
  const futureConviction = calcMaxConviction(
    maxCVStaked,
    maxCVSupply,
    totalEffectiveActivePoints,
  );
  if (
    typeof currentConviction !== "number" ||
    typeof futureConviction !== "number"
  ) {
    throw new Error("Invalid input. Conviction results must be numbers.");
  }
  const deductedFutureConviction = futureConviction - currentConviction;
  return Math.floor(deductedFutureConviction);
};

export const calcPointsNeeded = (
  threshold: number | string,
  maxCVStaked: number | bigint,
  maxCVSupply: number | bigint,
  totalEffectiveActivePoints: number | bigint,
): number | Error => {
  const maxConviction = calcMaxConviction(
    maxCVStaked,
    maxCVSupply,
    totalEffectiveActivePoints,
  );
  if (typeof threshold !== "number" || typeof maxConviction !== "number") {
    throw new Error(
      "Invalid input. Threshold and future conviction must be numbers.",
    );
  }
  const pointsNeeded = threshold - maxConviction;
  return Math.ceil(pointsNeeded);
};
