import { zeroAddress } from "viem";
import { Address, useContractRead } from "wagmi";
import {
  CVProposal,
  CVStrategy,
  Maybe,
  TokenGarden,
} from "#/subgraph/.graphclient";
import { useChainIdFromPath } from "./useChainIdFromPath";
import { cvStrategyABI } from "@/src/generated";
import { logOnce } from "@/utils/log";
import { calculatePercentageBigInt } from "@/utils/numbers";

type ProposalDataLight = Maybe<
  Pick<
    CVProposal,
    "proposalNumber" | "convictionLast" | "stakedAmount" | "threshold"
  > & {
    strategy: Pick<
      CVStrategy,
      "id" | "maxCVSupply" | "totalEffectiveActivePoints"
    >;
  }
>;

export const useConvictionRead = ({
  proposalData,
  tokenData: token,
  enabled = true,
}: {
  proposalData: ProposalDataLight | undefined;
  tokenData: Maybe<Pick<TokenGarden, "decimals">> | undefined;
  enabled?: boolean;
}) => {
  const chainId = useChainIdFromPath();
  const { data: updateConvictionLast, error } = useContractRead({
    chainId,
    address: (proposalData?.strategy.id ?? zeroAddress) as Address,
    abi: cvStrategyABI,
    functionName: "updateProposalConviction" as any,
    args: [BigInt(proposalData?.proposalNumber ?? 0)],
    enabled: enabled && !!proposalData,
  });

  if (error) {
    logOnce("error", "Error reading conviction", error);
  }

  if (!enabled || !proposalData || updateConvictionLast == null) {
    return {
      thresholdPct: undefined,
      totalSupportPct: undefined,
      currentConvictionPct: undefined,
      updateConvictionLast: undefined,
    };
  }

  let thresholdPct = calculatePercentageBigInt(
    proposalData!.threshold,
    proposalData.strategy.maxCVSupply,
    token?.decimals ?? 18,
  );

  let totalSupportPct = calculatePercentageBigInt(
    proposalData.stakedAmount,
    proposalData.strategy.totalEffectiveActivePoints,
    token?.decimals ?? 18,
  );

  let currentConvictionPct = calculatePercentageBigInt(
    updateConvictionLast as bigint,
    proposalData.strategy.maxCVSupply,
    token?.decimals ?? 18,
  );

  logOnce("debug", "Conviction computed numbers", {
    thresholdPct,
    totalSupportPct,
    currentConvictionPct,
    updateConvictionLast,
  });

  return {
    thresholdPct,
    totalSupportPct,
    currentConvictionPct,
    updateConvictionLast,
  };
};
