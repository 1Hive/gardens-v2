import * as dn from "dnum";
import { parseUnits } from "viem";

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
    return { value: Number(roundToSignificant(days, 2)), unit: "day" };
  } else if (hours >= 1) {
    return { value: Number(roundToSignificant(hours, 2)), unit: "hour" };
  } else if (minutes >= 1) {
    return { value: Number(roundToSignificant(minutes, 2)), unit: "min." };
  } else {
    return { value: Number(roundToSignificant(totalSeconds, 2)), unit: "sec." };
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
  if (value == null) {
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
  if (value1 == null || value2 == null || decimals == null) {
    return false;
  }
  const v1 = [value1, Number(decimals)] as dn.Numberish;
  const v2 = [value2, Number(decimals)] as dn.Numberish;

  return dn.greaterThan(v1, v2) || dn.equal(v1, v2);
}

export function calculatePercentageBigInt(
  value: bigint | string,
  total: bigint | string,
): number {
  if (value == null || total == null) {
    return 0;
  }

  if (typeof value !== "bigint") {
    value = BigInt(value);
  }

  if (typeof total !== "bigint") {
    total = BigInt(total);
  }

  if (!Boolean(total) || !Boolean(value)) {
    return 0;
  }

  const bps = (value * 10000n + total / 2n) / total;
  return Number(bps) / 100;
}

export function calculatePercentage(value1: number, value2: number): number {
  if (!value1 || !value2) {
    return 0;
  }

  if (value2 == 0) {
    return 0;
  }

  const divided = (value1 * 100) / value2;

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
 * Rounds a number or numeric string to the given number of significant digits,
 * preserving the full integer part if it already exceeds the precision.
 * Converts to fixed-point decimal notation and avoids scientific notation.
 * If the original value had a decimal but the output doesn't, a trailing dot is added.
 *
 * @param value - The number or numeric string to round.
 * @param precision - Number of significant digits to retain.
 * @param options - Optional settings:
 *   - truncate: If true, truncates instead of rounding. (default: false)
 *   - precisionMissIndicator: If true, adds a trailing dot if the original had a decimal but the output does not. (default: true)
 * @returns A string representation of the rounded number.
 */
export function roundToSignificant(
  value: number | string,
  precision: number,
  options?: { truncate?: boolean; showPrecisionMissIndicator?: boolean },
): string {
  const num: number = Number(value);
  if (!isFinite(num)) return String(num);

  const hadDecimal: boolean = String(value).includes(".");
  const absNum: number = Math.abs(num);

  if (absNum === 0) {
    if (precision <= 0) {
      return "0";
    }
    return precision > 1 ? "0." + "0".repeat(precision - 1) : "0";
  }

  const intPartStr: string = Math.trunc(absNum).toString();
  const intDigits: number = intPartStr.length;

  if (intDigits >= precision) {
    // Integer part already fills precision; round or truncate accordingly
    let adjustedInt = options?.truncate ? Math.trunc(num) : Math.round(num);

    const result = adjustedInt.toString();
    return hadDecimal && options?.showPrecisionMissIndicator !== false ?
        `${result}.`
      : result;
  }

  // Significant digits needed beyond integer part
  const scale = Math.pow(10, precision - intDigits);
  const adjusted =
    options?.truncate ?
      Math.trunc(num * scale) / scale
    : Math.round(num * scale) / scale;

  let resultStr = adjusted.toString();

  // Convert scientific notation to fixed-point
  if (resultStr.includes("e") || resultStr.includes("E")) {
    resultStr = adjusted.toLocaleString("en-US", {
      useGrouping: false,
      maximumFractionDigits: 100,
    });
  }

  if (
    !resultStr.includes(".") &&
    hadDecimal &&
    options?.showPrecisionMissIndicator !== false
  ) {
    return resultStr + ".";
  }

  return resultStr;
}

export const TEN = (n: number) => 10n ** BigInt(n);

export const scaleTo = (x: bigint, from: number, to: number) =>
  from === to ? x
  : from < to ? x * TEN(to - from)
  : x / TEN(from - to);

// scale down with round-up to avoid underfunding
export const scaleDownRoundUp = (x: bigint, fromDec: number, toDec: number) => {
  if (fromDec <= toDec) return x * TEN(toDec - fromDec);
  const f = TEN(fromDec - toDec);
  return (x + f - 1n) / f;
};

export const safeParseUnits = (v: string | number, d: number) => {
  try {
    return parseUnits(v.toString() || "0", d);
  } catch {
    return BigInt(Math.floor(+v * 10 ** d));
  }
};

export const ceilDiv = (a: bigint, b: bigint) => (a + b - 1n) / b;

export const SEC_TO_MONTH = 2628000; // 3600 secs * 24 hours * 30.41667 days
export const MONTH_TO_SEC = 1 / SEC_TO_MONTH;

export const bigNumberMax = (a: bigint, b: bigint) => (a > b ? a : b);
export const bigNumberMin = (a: bigint, b: bigint) => (a < b ? a : b);

export const formatCountWhenPlus1k = (count: number) =>
  count >= 1000 ? "1000+" : count;
