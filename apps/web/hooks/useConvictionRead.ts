import { zeroAddress } from "viem";
import { Address, useContractRead } from "wagmi";
import {
  CVProposal,
  CVStrategy,
  Maybe,
  TokenGarden,
} from "#/subgraph/.graphclient";
import { cvStrategyABI } from "@/src/generated";
import { logOnce } from "@/utils/log";
import { calculatePercentageBigInt } from "@/utils/numbers";

type ProposalDataLight = Maybe<
  Pick<
    CVProposal,
    | "proposalNumber"
    | "convictionLast"
    | "stakedAmount"
    | "threshold"
    | "requestedAmount"
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
  const cvStrategyContract = {
    address: (proposalData?.strategy.id ?? zeroAddress) as Address,
    abi: cvStrategyABI,
    enabled: !!proposalData,
  };

  //actual way of getting conviction from contract
  const { data: updateConvictionLast, error } = useContractRead({
    ...cvStrategyContract,
    functionName: "updateProposalConviction" as any,
    args: [BigInt(proposalData?.proposalNumber ?? 0)],
    enabled,
  });

  const { data: thresholdFromContract, error: errorThreshold } =
    useContractRead({
      ...cvStrategyContract,
      functionName: "calculateThreshold" as any,
      args: [proposalData?.requestedAmount ?? 0],
      enabled,
    });

  if (error) {
    logOnce("error", "Error reading conviction", error);
  }

  if (errorThreshold) {
    logOnce("error", "Error reading threshold", errorThreshold);
  }

  if (!enabled) {
    return {
      thresholdPct: undefined,
      totalSupportPct: undefined,
      currentConvictionPct: undefined,
      updateConvictionLast: undefined,
    };
  }

  if (!proposalData || updateConvictionLast == null) {
    return {
      thresholdPct: undefined,
      totalSupportPct: undefined,
      currentConvictionPct: undefined,
      updateConvictionLast: undefined,
    };
  }

  let thresholdPct = calculatePercentageBigInt(
    thresholdFromContract as bigint,
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
