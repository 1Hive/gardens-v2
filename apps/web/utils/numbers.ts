import * as dn from "dnum";
import { formatUnits } from "viem";

export const INPUT_MIN_VALUE = 0.000000000001;
export const MAX_RATIO_CONSTANT = 0.77645;
export const CV_PERCENTAGE_SCALE = 10 ** 4;
export const CV_PASSPORT_THRESHOLD_SCALE = 10 ** 4;
export const CV_PERCENTAGE_SCALE_DECIMALS = 4;

export const UI_PERCENTAGE_FORMAT = 10 ** 2; // 100% = 1
export const UI_PERCENTAGE_FORMAT_DECIMALS = 2;

export const SCALE_PRECISION = CV_PERCENTAGE_SCALE * UI_PERCENTAGE_FORMAT; // 1% = 10.000
export const SCALE_PRECISION_DECIMALS =
  CV_PERCENTAGE_SCALE_DECIMALS + UI_PERCENTAGE_FORMAT_DECIMALS; // 6 decimals

export const CV_SCALE_PRECISION = 10 ** 7;
export const CV_SCALE_PRECISION_DECIMALS = 7;
export const ETH_DECIMALS = 18;

export function convertSecondsToReadableTime(totalSeconds: number): {
  value: number;
  unit: "sec." | "min." | "hour" | "day";
} {
  const days = totalSeconds / (24 * 60 * 60);
  const hours = totalSeconds / (60 * 60);
  const minutes = totalSeconds / 60;

  if (days >= 1) {
    return { value: Number(days.toPrecision(2)), unit: "day" };
  } else if (hours >= 1) {
    return { value: Number(hours.toPrecision(2)), unit: "hour" };
  } else if (minutes >= 1) {
    return { value: Number(minutes.toPrecision(2)), unit: "min." };
  } else {
    return { value: Number(totalSeconds.toPrecision(2)), unit: "sec." };
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

export function formatTokenAmount(
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

export function calculateFees(
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

export function gte(
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

export function calculatePercentageBigInt(
  value1: bigint,
  value2: bigint,
  tokenDecimals: number = 0,
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
export function calculatePercentage(value1: number, value2: number): number {
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

export function calculatePercentageDecimals(
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

export function calculateDecay(blockTime: number, convictionGrowth: number) {
  const halfLifeInSeconds = convictionGrowth * 24 * 60 * 60;

  const result =
    Math.pow(10, 7) * Math.pow(1 / 2, blockTime / halfLifeInSeconds);

  return Math.floor(result);
}

export function calculateMaxRatioNum(
  spendingLimit: number,
  minimumConviction: number,
) {
  return spendingLimit / (1 - Math.sqrt(minimumConviction));
}

export function bigIntMin(a: bigint, b: bigint) {
  return a < b ? a : b;
}

/**
 * Same as `Number.toPrecision`, but handles exponential notation
 * and converts it to fixed decimal notation.
 * @param value
 * @param precision
 * @returns String representation of the number with specified precision.
 * If the number is NaN, Infinity, or -Infinity, it returns the string representation
 * of the number.
 */
export function toPrecision(value: number | string, precision: number) {
  const num = Number(value);
  if (!isFinite(num)) return String(num); // Handle NaN, Infinity, -Infinity

  const output = num.toPrecision(precision);
  if (output.includes("e") || output.includes("E")) {
    // Convert from exponential to fixed decimal
    const [mantissa, exponent] = output.split(/[eE]/);
    const exp = parseInt(exponent, 10);

    let [intPart, fracPart = ""] = mantissa.split(".");
    const digits = intPart + fracPart;

    if (exp >= 0) {
      const decimalShift = digits + "0".repeat(exp - fracPart.length);
      return decimalShift;
    } else {
      const leadingZeros = "0".repeat(Math.abs(exp) - 1);
      return `0.${leadingZeros}${digits}`;
    }
  }

  // Trim trailing zeros but keep at least one digit after the decimal point
  const trimmed = output.replace(/(\.\d*?[1-9])0+$/, "$1").replace(/\.0+$/, "");
  if (trimmed === "") {
    return "0"; // If the result is empty, return "0"
  }
  return trimmed;
}
