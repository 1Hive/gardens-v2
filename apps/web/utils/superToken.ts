import { Address, zeroAddress } from "viem";

export const getSuperTokenInfo = ({
  address,
  token,
  balance,
  sameAsUnderlying,
}: {
  address?: Address;
  token?: { symbol: string; decimals: number };
  balance?: { value: bigint; formatted: string };
  sameAsUnderlying?: boolean;
}) => {
  if (!address || !token) return undefined;

  return {
    address,
    symbol: token.symbol,
    decimals: token.decimals,
    value: balance?.value ?? 0n,
    formatted: balance?.formatted ?? "0",
    sameAsUnderlying,
  };
};

export const getConfiguredSuperTokenAddress = (
  superfluidToken?: string | null,
): Address | undefined => {
  if (!superfluidToken || superfluidToken === zeroAddress) {
    return undefined;
  }

  return superfluidToken as Address;
};

export const isSameAddress = (
  addressA?: string | null,
  addressB?: string | null,
) => {
  if (!addressA || !addressB) {
    return false;
  }

  return addressA.toLowerCase() === addressB.toLowerCase();
};
