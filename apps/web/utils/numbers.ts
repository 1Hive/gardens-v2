import * as dn from "dnum";
import { formatUnits } from "viem";

export const INPUT_MIN_VALUE = 0.000000000001;
export const MAX_RATIO_CONSTANT = 0.77645;
export const CV_PERCENTAGE_SCALE_DECIMALS = 4;
export const CV_PERCENTAGE_SCALE = 10 ** CV_PERCENTAGE_SCALE_DECIMALS;

export const UI_PERCENTAGE_FORMAT_DECIMALS = 2;
export const UI_PERCENTAGE_FORMAT = 10 ** UI_PERCENTAGE_FORMAT_DECIMALS; // 100% = 1

export const SCALE_PRECISION = CV_PERCENTAGE_SCALE * UI_PERCENTAGE_FORMAT; // 1% = 10.000
export const SCALE_PRECISION_DECIMALS =
  CV_PERCENTAGE_SCALE_DECIMALS + UI_PERCENTAGE_FORMAT_DECIMALS; // 6 decimals

export const CV_SCALE_PRECISION_DECIMALS = 14;
export const CV_SCALE_PRECISION = 10 ** CV_SCALE_PRECISION_DECIMALS;
export const ETH_DECIMALS = 18;

export function convertSecondsToReadableTime(totalSeconds: number): {
  value: number;
  unit: "second" | "minute" | "hour" | "day";
} {
  const days = totalSeconds / (24 * 60 * 60);
  const hours = totalSeconds / (60 * 60);
  const minutes = totalSeconds / 60;

  if (days >= 1) {
    return { value: Number(days.toPrecision(2)), unit: "day" };
  } else if (hours >= 1) {
    return { value: Number(hours.toPrecision(2)), unit: "hour" };
  } else if (minutes >= 1) {
    return { value: Number(minutes.toPrecision(2)), unit: "minute" };
  } else {
    return { value: Number(totalSeconds.toPrecision(2)), unit: "second" };
  }
}

export function parseToken(value: dn.Dnum | string, compact?: boolean) {
  const str =
    typeof value === "string" ? value : (
      dn.format([BigInt(value[0]), Number(value[1])])
    );

  const charsLength = 3;
  const prefixLength = 2; // "0."

  if (!str) {
    return "";
  }
  if (str.length < charsLength * 2 + prefixLength) {
    return str;
  }
  if (str.slice(0, 2) === "0.") {
    return (
      str.slice(0, charsLength + prefixLength - 1) +
      "…" +
      str.slice(-charsLength)
    );
  }
  if (typeof value === "string") {
    return dn.format(dn.from(value), {
      compact: compact,
      digits: 2,
    });
  }

  return dn.format(value, { compact: compact, digits: 2 });
}

function formatTokenAmount(
  value: string | number | bigint | undefined,
  decimals: number,
  digits?: number,
) {
  if (digits === undefined) {
    digits = 2;
  }
  if (!value) {
    return "0";
  }
  const num = [BigInt(Math.floor(Number(value))), decimals] as const;

  return dn.format(num, { digits: digits });
}

function calculateFees(
  stakeAmount: string,
  fee: string,
  tokenDecimals: number,
) {
  const dividend = BigInt(stakeAmount) * BigInt(fee || 0);
  const divisor = BigInt(100) * BigInt(SCALE_PRECISION);

  const result = dividend / divisor;
  const num = [result, tokenDecimals] as dn.Dnum;

  return dn.format(num);
}

function gte(
  value1: bigint | undefined,
  value2: bigint | undefined,
  decimals: number | string,
): boolean {
  if (!value1 || !value2 || !decimals) {
    return false;
  }
  const v1 = [value1, Number(decimals)] as dn.Numberish;
  const v2 = [value2, Number(decimals)] as dn.Numberish;

  return dn.greaterThan(v1, v2) || dn.equal(v1, v2);
}

function calculatePercentageBigInt(
  value1: bigint,
  value2: bigint,
  tokenDecimals: number,
): number {
  if (!value1 || !value2) {
    // console.log("divideWithDecimals: value1 or value2 is undefined");
    return 0;
  }

  if (value1 == 0n || value2 == 0n) {
    return 0;
  }

  return parseFloat(
    (
      (parseFloat(formatUnits(value1, tokenDecimals)) /
        parseFloat(formatUnits(value2, tokenDecimals))) *
      100
    ).toFixed(2),
  );
}
function calculatePercentage(value1: number, value2: number): number {
  if (!value1 || !value2) {
    // console.log("divideWithDecimals: value1 or value2 is undefined");
    return 0;
  }

  if (value2 == 0) {
    // console.log("divideWithDecimals: value2 is 0");
    return 0;
  }

  const divided = (value1 * 100) / value2;
  // console.log("divideWithDecimals: ", divided);

  return parseFloat(divided.toFixed(2));
}

function calculatePercentageDecimals(
  value1: number | bigint,
  value2: number | bigint,
  decimals: number,
): number {
  if (value1 === undefined || value2 === undefined) {
    return 0;
  }

  let dnumValue1;
  let dnumValue2;
  try {
    dnumValue1 = dn.from(value1);
    dnumValue2 = dn.from(value2);
  } catch (error) {
    console.error(error);
    return 0;
  }

  if (dn.eq(dnumValue2, 0)) {
    return 0;
  }
  const PRECISION = 4;

  const percentage = dn.div(
    dn.mul(dnumValue1, 100 * 10 ** PRECISION),
    dnumValue2,
    decimals,
  );

  const formattedPercentage = dn.format(percentage, 2);

  return Number(formattedPercentage);
}

function calculateDecay(blockTime: number, convictionGrowth: number) {
  const halfLifeInSeconds = convictionGrowth * 24 * 60 * 60;

  const result =
    Math.pow(10, 7) * Math.pow(1 / 2, blockTime / halfLifeInSeconds);

  return Math.floor(result);
}

function calculateMaxRatioNum(
  spendingLimit: number,
  minimumConviction: number,
) {
  return spendingLimit / (1 - Math.sqrt(minimumConviction));
}

export {
  calculateFees,
  formatTokenAmount,
  gte,
  dn,
  calculatePercentageDecimals,
  calculatePercentageBigInt,
  calculatePercentage,
  calculateDecay,
  calculateMaxRatioNum,
};
