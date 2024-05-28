import * as dn from "dnum";

export const PRECISION_SCALE = BigInt(10 ** 4);
export const INPUT_MIN_VALUE = 0.000000000001;
export const MAX_RATIO_CONSTANT = 0.77645;
export const PERCENTAGE_PRECISION = 10 ** 7;
export const PERCENTAGE_PRECISION_DECIMALS = 7;

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

// function calculatePercentage(
//   value1: number | undefined,
//   value2: number | undefined,
// ): number {
//   if (!value1 || !value2) {
//     return 0;
//   }
//   const percentage = (value1 * 100) / value2;
//   return parseFloat(percentage.toFixed(2));
// }

function calculatePercentage(
  value1: number | bigint | string | undefined,
  value2: number | bigint | string | undefined,
  decimals: number,
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
    console.log(error);
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

  console.log(formattedPercentage);
  return Number(formattedPercentage);
}

export { calculateFees, formatTokenAmount, gte, dn, calculatePercentage };
