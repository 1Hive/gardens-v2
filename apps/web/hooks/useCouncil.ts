import { Address, useAccount, useContractRead } from "wagmi";
import { Maybe, RegistryCommunity } from "#/subgraph/.graphclient";
import { useChainFromPath } from "./useChainFromPath";
import { useFlag } from "./useFlag";
import { useHasContractCode } from "./useHasContractCode";
import { useResolvedChainId } from "./useResolvedChainId";
import { safeABI } from "@/src/customAbis";

type StrategyOrCommunity =
  | {
      registryCommunity:
        | Maybe<Pick<RegistryCommunity, "councilSafe">>
        | undefined;
    }
  | Pick<RegistryCommunity, "councilSafe">;

type Props = {
  strategyOrCommunity: StrategyOrCommunity | null | undefined;
  detectCouncilMember?: boolean;
};

export const useCouncil = ({
  strategyOrCommunity,
  detectCouncilMember = true,
}: Props) => {
  const showAsCouncil = useFlag("showAsCouncilSafe");
  const { address } = useAccount();
  const chain = useChainFromPath();
  const resolvedChainId = useResolvedChainId(chain?.id);
  const councilSafeAddress =
    strategyOrCommunity &&
    ("registryCommunity" in strategyOrCommunity ?
      strategyOrCommunity.registryCommunity?.councilSafe
    : strategyOrCommunity.councilSafe);
  const { hasContractCode: hasCouncilSafeCode } = useHasContractCode({
    address: councilSafeAddress ?? undefined,
    chainId: resolvedChainId,
    enabled: !!councilSafeAddress && detectCouncilMember,
  });

  const { data: councilMembers } = useContractRead({
    abi: safeABI,
    address: councilSafeAddress as Address,
    functionName: "getOwners",
    chainId: resolvedChainId,
    enabled: !!councilSafeAddress && detectCouncilMember && hasCouncilSafeCode,
    onError: () => {
      console.warn("Council Safe owners could not be read.");
    },
  });

  return {
    isCouncilSafe:
      showAsCouncil ||
      councilSafeAddress?.toLowerCase() === address?.toLowerCase(),
    isCouncilMember: !!councilMembers?.some(
      (member) => member.toLowerCase() === address?.toLowerCase(),
    ),
    councilMembers,
  };
};
