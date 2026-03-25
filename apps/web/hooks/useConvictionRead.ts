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
import { useHasContractCode } from "./useHasContractCode";
import { useResolvedChainId } from "./useResolvedChainId";
import { cvStrategyABI } from "@/src/generated";
import { PoolTypes } from "@/types";
import { getRemainingBlocksToPass } from "@/utils/convictionFormulas";
import { logOnce } from "@/utils/log";
import { calculatePercentageBigInt, CV_SCALE_PRECISION } from "@/utils/numbers";

export type ProposalDataLight = Maybe<
  Pick<
    CVProposal,
    "proposalNumber" | "stakedAmount" | "requestedAmount" | "beneficiary"
  > & {
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
  chainId,
  enabled = true,
}: {
  proposalData: ProposalDataLight | undefined;
  strategyConfig: Pick<CVStrategyConfig, "decay" | "proposalType"> | undefined;
  tokenData: Maybe<Pick<TokenGarden, "decimals">> | undefined;
  chainId?: number;
  enabled?: boolean;
}) => {
  const chain = useChainFromPath();
  const resolvedChainId = useResolvedChainId(chainId);

  const cvStrategyContract = {
    address: proposalData?.strategy.id as Address,
    abi: cvStrategyABI,
    enabled: !!proposalData,
  };
  const { hasContractCode: hasStrategyContractCode } = useHasContractCode({
    address: proposalData?.strategy.id,
    chainId: resolvedChainId,
    enabled: enabled && !!proposalData?.strategy.id && resolvedChainId != null,
  });
  const shouldReadConviction =
    enabled && !!proposalData && hasStrategyContractCode;

  if (enabled && proposalData?.strategy.id && resolvedChainId != null) {
    logOnce("debug", "[useConvictionRead] read inputs", {
      strategyAddress: proposalData.strategy.id,
      proposalNumber: proposalData.proposalNumber,
      explicitChainId: chainId,
      resolvedChainId,
      pathChainId: chain?.id,
      hasStrategyContractCode,
    });
  }

  const {
    data: updatedConviction,
    error: errorConviction,
    refetch: triggerConvictionRefetch,
  } = useContractRead({
    ...cvStrategyContract,
    chainId: resolvedChainId,
    functionName: "calculateProposalConviction",
    args: [BigInt(proposalData?.proposalNumber ?? 0)],
    enabled: shouldReadConviction,
    watch: true,
  });

  if (errorConviction) {
    logOnce("error", "Error reading conviction", errorConviction);
  }
  const poolType = PoolTypes[strategyConfig?.proposalType];
  const shouldReadThreshold =
    shouldReadConviction && poolType !== "signaling";

  const {
    data: thresholdFromContract,
    error: thresholdReadError,
    refetch: triggerThresholdRefetch,
  } = useContractRead({
    ...cvStrategyContract,
    chainId: resolvedChainId,
    functionName: "calculateThreshold",
    args: [proposalData?.requestedAmount ?? 0],
    enabled: shouldReadThreshold,
    watch: true,
  });

  if (
    thresholdReadError &&
    thresholdReadError.message.includes("AmountOverMaxRatio") === false
  ) {
    logOnce(
      "error",
      "Error reading threshold from contract",
      thresholdReadError,
    );
  }

  // calculate time to pass for proposal te be executed
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

  const initialized =
    proposalData &&
    updatedConviction != null &&
    chain != null &&
    strategyConfig &&
    enabled;

  const timeToPass =
    initialized ?
      Date.now() / 1000 + remainingBlocksToPass * (blockTime ?? 0)
    : undefined;

  let thresholdPct = useMemo(
    () =>
      initialized && thresholdFromContract != null ?
        calculatePercentageBigInt(
          thresholdFromContract as bigint,
          BigInt(proposalData.strategy.maxCVSupply),
        )
      : undefined,
    [
      thresholdFromContract,
      proposalData?.strategy.maxCVSupply,
      token?.decimals,
      initialized,
    ],
  );

  let totalSupportPct = useMemo(
    () =>
      initialized ?
        calculatePercentageBigInt(
          proposalData.stakedAmount,
          proposalData.strategy.totalEffectiveActivePoints,
        )
      : undefined,
    [
      proposalData?.stakedAmount,
      proposalData?.strategy.totalEffectiveActivePoints,
      token?.decimals,
      initialized,
    ],
  );

  let currentConvictionPct = useMemo(
    () =>
      initialized ?
        calculatePercentageBigInt(
          BigInt(updatedConviction.toString()),
          proposalData.strategy.maxCVSupply,
        )
      : undefined,
    [
      updatedConviction,
      proposalData?.strategy.maxCVSupply,
      token?.decimals,
      initialized,
    ],
  );

  logOnce("debug", "Conviction computed numbers", {
    thresholdPct,
    thresholdFromContract,
    totalSupportPct,
    currentConvictionPct,
  });

  return initialized ?
      {
        thresholdPct,
        totalSupportPct,
        currentConvictionPct,
        updatedConviction,
        timeToPass,
        triggerConvictionRefetch: () => {
          void triggerConvictionRefetch();
          void triggerThresholdRefetch();
        },
      }
    : {
        thresholdPct: undefined,
        totalSupportPct: undefined,
        currentConvictionPct: undefined,
        updatedConviction: undefined,
        timeToPass: undefined,
      };
};
