import * as dn from "dnum";

function validateInput(input: any) {
  return Number.isInteger(Number(input));
}

type NumberOrBigInt = number | bigint;

export const calcThresholdPct = (
  threshold: NumberOrBigInt,
  maxCVSupply: NumberOrBigInt,
  tokenDecimals: number,
): string | number => {
  if (
    !validateInput(threshold) ||
    !validateInput(maxCVSupply) ||
    threshold < 0 ||
    maxCVSupply <= 0
  ) {
    return 0;
  }

  const thresholdPct = dn.divide(threshold, maxCVSupply, tokenDecimals);

  const formatThresholdPct = (
    Number(dn.format(thresholdPct, { digits: 4 })) * 100
  ).toFixed(2);

  return formatThresholdPct;
};

export const calcTotalSupport = (
  totalStaked: NumberOrBigInt,
  effActPoints: NumberOrBigInt,
  tokenDecimals: number,
) => {
  if (!validateInput(totalStaked) || totalStaked < 0 || effActPoints <= 0) {
    return "0";
  }
  const totalSupport = dn.divide(totalStaked, effActPoints, tokenDecimals);
  const formattedTotalSupport = (
    Number(dn.format(totalSupport, { digits: 4 })) * 100
  ).toFixed(2);
  return formattedTotalSupport;
};

export const calcCurrentConviction = (
  convictionLast: NumberOrBigInt,
  maxCVSupply: NumberOrBigInt,
  tokenDecimals: number,
) => {
  if (
    !validateInput(convictionLast) ||
    !validateInput(maxCVSupply) ||
    convictionLast < 0 ||
    maxCVSupply <= 0
  ) {
    return 0;
  }
  const currentConviction = dn.divide(
    convictionLast,
    maxCVSupply,
    tokenDecimals,
  );
  const formattedCurrentConv = (
    Number(dn.format(currentConviction, { digits: 4 })) * 100
  ).toFixed(2);
  return formattedCurrentConv;
};

export function getRemainingBlocksToPass(
  threshold: number,
  conviction: number,
  amount: number,
  alpha: number,
) {
  const a = alpha;
  const y = threshold;
  const y0 = conviction;
  const x = amount;

  const blocksToPass =
    Math.log(((a - 1) * y + x) / ((a - 1) * y0 + x)) / Math.log(a);

  if (blocksToPass < 0 || isNaN(blocksToPass)) {
    return 0;
  }

  return blocksToPass;
}
