import * as dn from "dnum";

export const PRECISION_SCALE = BigInt(10 ** 4);
export const ARB_BLOCK_TIME = 0.23;
export const INPUT_MIN_VALUE = 0.000000000001;
export const MAX_RATIO_CONSTANT = 0.77645;

function formatTokenAmount(
  value: string | number | bigint | undefined,
  decimals: number,
) {
  if (!value) {
    return "0";
  }
  const num = [BigInt(value), decimals] as const;

  return dn.format(num, { digits: 2 });
}

function calculateFees(
  stakeAmount: string,
  fee: string,
  tokenDecimals: number,
) {
  const dividend = BigInt(stakeAmount) * BigInt(fee || 0);
  const divisor = BigInt(100) * PRECISION_SCALE;

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

function calculatePercentage(
  value1: number | undefined,
  value2: number | undefined,
): number {
  if (!value1 || !value2) {
    return 0;
  }
  const percentage = (value1 * 100) / value2;
  return parseFloat(percentage.toFixed(2));
}

export { calculateFees, formatTokenAmount, gte, dn, calculatePercentage };
