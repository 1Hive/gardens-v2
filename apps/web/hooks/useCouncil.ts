import { Address, useAccount, useContractRead } from "wagmi";
import { Maybe, RegistryCommunity } from "#/subgraph/.graphclient";
import { useChainFromPath } from "./useChainFromPath";
import { useFlag } from "./useFlag";
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
  const councilSafeAddress =
    strategyOrCommunity &&
    ("registryCommunity" in strategyOrCommunity ?
      strategyOrCommunity.registryCommunity?.councilSafe
    : strategyOrCommunity.councilSafe);

  const { data: councilMembers } = useContractRead({
    abi: safeABI,
    address: councilSafeAddress as Address,
    functionName: "getOwners",
    chainId: chain?.id,
    enabled: !!councilSafeAddress && detectCouncilMember,
    onError: (err) => {
      console.error("Error reading council safe owners:", err);
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
