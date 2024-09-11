import { Address, useAccount, useContractRead } from "wagmi";
import { useChainIdFromPath } from "./useChainIdFromPath";
import { safeABI } from "@/src/generated";
import { abiWithErrors2 } from "@/utils/abiWithErrors";

type Props = {
  safeAddress?: string | null;
};

export function useIsSafe({ safeAddress }: Props) {
  const { address } = useAccount();
  const chainId = useChainIdFromPath();

  const lowercaseAddress = address?.toLowerCase();

  const { data: isSafeMember } = useContractRead({
    address: safeAddress as Address,
    abi: abiWithErrors2(safeABI),
    functionName: "isOwner",
    chainId: Number(chainId),
    enabled:
      !!safeAddress && !!lowercaseAddress && lowercaseAddress !== safeAddress,
    args: [lowercaseAddress as Address],
    onError: () => {
      console.error("Error reading isOwner from Safe: ", safeAddress);
    },
  });

  console.log({
    lowercaseAddress,
    safeAddress,
  });

  return {
    isSafeMemberConnected: !!isSafeMember,
    isSafeConnected: lowercaseAddress === safeAddress,
    shouldSeeSafeButton: !!isSafeMember || lowercaseAddress === safeAddress,
  };
}
