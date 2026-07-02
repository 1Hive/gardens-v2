import { Address, zeroAddress } from "viem";

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
