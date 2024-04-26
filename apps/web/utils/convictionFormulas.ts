import * as dn from "dnum";
import { formatTokenAmount } from "./numbers";

function validateInput(input: any) {
  return Number.isInteger(Number(input));
}

type numberOrBigInt = number | bigint;

export const calcThresholdPct = (
  threshold: numberOrBigInt,
  maxCVSupply: numberOrBigInt,
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
  totalStaked: numberOrBigInt,
  effActPoints: numberOrBigInt,
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
  convictionLast: numberOrBigInt,
  maxCVSupply: numberOrBigInt,
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
