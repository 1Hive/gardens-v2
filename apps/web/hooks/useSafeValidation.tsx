import { useCallback, useMemo } from "react";
import { Address, isAddress } from "viem";
import { useContractRead } from "wagmi";
import { useChainFromPath } from "@/hooks/useChainFromPath";
import { safeABI } from "@/src/generated";

interface UseSafeValidationProps {
  address?: Address | string;
  enabled?: boolean;
}

interface UseSafeValidationReturn {
  isSafe: boolean;
  isLoading: boolean;
  error: Error | null;
  validate: (address: Address) => Promise<boolean>;
}

/**
 * Hook to validate if an address is a Safe contract
 * @param address - The address to validate
 * @param enabled - Whether to enable the validation
 */
export function useSafeValidation({
  address,
  enabled = true,
}: UseSafeValidationProps): UseSafeValidationReturn {
  const chain = useChainFromPath();

  // Check if validation should be bypassed
  const shouldBypass = useMemo(() => {
    return localStorage.getItem("bypassSafeCheck") === "true";
  }, []);

  // Prepare the address for validation
  const validAddress = useMemo(() => {
    if (!address || !isAddress(address)) return undefined;
    return address as Address;
  }, [address]);

  // Contract read hook for Safe validation
  const {
    data: owners,
    isLoading,
    error,
    refetch,
  } = useContractRead({
    address: validAddress,
    abi: safeABI,
    functionName: "getOwners",
    enabled: !shouldBypass && !!validAddress && enabled,
    chainId: chain?.id,
  });

  // Validation function that can be called manually
  const validate = useCallback(
    async (addressToValidate: Address): Promise<boolean> => {
      if (localStorage.getItem("bypassSafeCheck") === "true") {
        return true;
      }

      try {
        const result = await refetch();
        return !!result.data;
      } catch (err) {
        console.warn(
          `${addressToValidate} is not a valid Safe address in the ${chain?.name} network`,
          err,
        );
        return false;
      }
    },
    [refetch, chain?.name],
  );

  return {
    isSafe: shouldBypass || !!owners,
    isLoading,
    error: error as Error | null,
    validate,
  };
}
