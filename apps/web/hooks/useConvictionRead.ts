import { useMemo } from "react";
import { Address, useContractRead } from "wagmi";
import {
  CVProposal,
  CVStrategy,
  CVStrategyConfig,
  Maybe,
  TokenGarden,
} from "#/subgraph/.graphclient";
import { useChainFromPath } from "./useChainFromPath";
import { useChainIdFromPath } from "./useChainIdFromPath";
import { cvStrategyABI } from "@/src/generated";
import { PoolTypes } from "@/types";
import { getRemainingBlocksToPass } from "@/utils/convictionFormulas";
import { logOnce } from "@/utils/log";
import { calculatePercentageBigInt, CV_SCALE_PRECISION } from "@/utils/numbers";

export type ProposalDataLight = Maybe<
  Pick<CVProposal, "proposalNumber" | "stakedAmount" | "requestedAmount"> & {
    strategy: Pick<
      CVStrategy,
      "id" | "maxCVSupply" | "totalEffectiveActivePoints"
    >;
  }
>;

export const useConvictionRead = ({
  proposalData,
  strategyConfig,
  tokenData: token,
  enabled = true,
}: {
  proposalData: ProposalDataLight | undefined;
  strategyConfig: Pick<CVStrategyConfig, "decay" | "proposalType"> | undefined;
  tokenData: Maybe<Pick<TokenGarden, "decimals">> | undefined;
  enabled?: boolean;
}) => {
  const chainIdFromPath = useChainIdFromPath();
  const chain = useChainFromPath();

  const cvStrategyContract = {
    address: proposalData?.strategy.id as Address,
    abi: cvStrategyABI,
    chainId: chainIdFromPath,
    enabled: !!proposalData,
  };

  const {
    data: updatedConviction,
    error: errorConviction,
    refetch: triggerConvictionRefetch,
  } = useContractRead({
    ...cvStrategyContract,
    functionName: "calculateProposalConviction",
    args: [BigInt(proposalData?.proposalNumber ?? 0)],
    enabled,
  });

  const { data: thresholdFromContract, error: errorThreshold } =
    useContractRead({
      ...cvStrategyContract,
      functionName: "calculateThreshold" as any,
      args: [proposalData?.requestedAmount ?? 0],
      enabled: enabled && PoolTypes[strategyConfig?.proposalType] === "funding",
    });

  if (errorThreshold) {
    logOnce("error", "Error reading threshold", errorThreshold);
  }

  if (errorConviction) {
    logOnce("error", "Error reading conviction", errorConviction);
  }

  //calculate time to pass for proposal te be executed
  const alphaDecay = +strategyConfig?.decay / CV_SCALE_PRECISION;

  const remainingBlocksToPass = useMemo(
    () =>
      getRemainingBlocksToPass(
        Number(thresholdFromContract),
        Number(updatedConviction),
        Number(proposalData?.stakedAmount),
        alphaDecay,
      ),
    [thresholdFromContract, updatedConviction, proposalData?.stakedAmount],
  );
  const blockTime = chain?.blockTime;

  const timeToPass =
    Date.now() / 1000 + remainingBlocksToPass * (blockTime ?? 0);

  if (!enabled) {
    return {
      thresholdPct: undefined,
      totalSupportPct: undefined,
      currentConvictionPct: undefined,
      updatedConviction: undefined,
      timeToPass: undefined,
    };
  }

  if (
    !proposalData ||
    updatedConviction == null ||
    chain == undefined ||
    !strategyConfig
  ) {
    return {
      thresholdPct: undefined,
      totalSupportPct: undefined,
      currentConvictionPct: undefined,
      updatedConviction: undefined,
      timeToPass: undefined,
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
    BigInt(updatedConviction.toString()),
    proposalData.strategy.maxCVSupply,
    token?.decimals ?? 18,
  );

  logOnce("debug", "Conviction computed numbers", {
    thresholdPct,
    totalSupportPct,
    currentConvictionPct,
  });

  return {
    thresholdPct,
    totalSupportPct,
    currentConvictionPct,
    updatedConviction,
    timeToPass,
    triggerConvictionRefetch: () => triggerConvictionRefetch(),
  };
};
