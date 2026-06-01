import { useCallback, useEffect, useMemo, useState } from "react";
import { Address } from "wagmi";
import {
  CVProposal,
  CVStrategy,
  CVStrategyConfig,
  Maybe,
  TokenGarden,
} from "#/subgraph/.graphclient";
import { useChainFromPath } from "./useChainFromPath";
import { useHasContractCode } from "./useHasContractCode";
import { usePreferredReadClient } from "./usePreferredReadClient";
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
  const readClient = usePreferredReadClient(resolvedChainId);
  const [updatedConviction, setUpdatedConviction] = useState<bigint>();
  const [thresholdFromContract, setThresholdFromContract] = useState<bigint>();
  const [errorConviction, setErrorConviction] = useState<unknown>();
  const [thresholdReadError, setThresholdReadError] = useState<unknown>();

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

  const proposalNumber = BigInt(proposalData?.proposalNumber ?? 0);
  const requestedAmount = BigInt(proposalData?.requestedAmount ?? 0);
  const poolType = PoolTypes[strategyConfig?.proposalType];
  const isStreamingPool = poolType === "streaming";
  const hasRequestedAmount = requestedAmount > 0n;
  const shouldReadThreshold = shouldReadConviction && poolType !== "signaling";
  const shouldReadThresholdFromContract =
    shouldReadThreshold && (hasRequestedAmount || isStreamingPool);

  const readConvictionData = useCallback(async () => {
    if (!shouldReadConviction || !readClient || !cvStrategyContract.address) {
      setUpdatedConviction(undefined);
      setThresholdFromContract(undefined);
      return;
    }

    try {
      const nextConviction = await readClient.readContract({
        ...cvStrategyContract,
        functionName: "calculateProposalConviction",
        args: [proposalNumber],
      });
      setUpdatedConviction(nextConviction as bigint);
      setErrorConviction(undefined);
    } catch (error) {
      setUpdatedConviction(undefined);
      setErrorConviction(error);
    }

    if (!shouldReadThresholdFromContract) {
      setThresholdFromContract(undefined);
      setThresholdReadError(undefined);
      return;
    }

    try {
      const nextThreshold = await readClient.readContract({
        ...cvStrategyContract,
        functionName: "calculateThreshold",
        args: [requestedAmount],
      });
      setThresholdFromContract(nextThreshold as bigint);
      setThresholdReadError(undefined);
    } catch (error) {
      setThresholdFromContract(undefined);
      setThresholdReadError(error);
    }
  }, [
    cvStrategyContract.address,
    proposalNumber,
    readClient,
    requestedAmount,
    shouldReadConviction,
    shouldReadThresholdFromContract,
  ]);

  useEffect(() => {
    if (!shouldReadConviction || !readClient) {
      setUpdatedConviction(undefined);
      setThresholdFromContract(undefined);
      setErrorConviction(undefined);
      setThresholdReadError(undefined);
      return;
    }

    void readConvictionData();

    const unwatch = readClient.watchBlockNumber({
      onBlockNumber: () => {
        void readConvictionData();
      },
    });

    return () => {
      unwatch();
    };
  }, [readClient, readConvictionData, shouldReadConviction]);

  if (errorConviction) {
    logOnce("error", "Error reading conviction", errorConviction);
  }

  const resolvedThreshold = useMemo(() => {
    if (!shouldReadThreshold) {
      return undefined;
    }

    return shouldReadThresholdFromContract ? thresholdFromContract : 0n;
  }, [
    shouldReadThreshold,
    shouldReadThresholdFromContract,
    thresholdFromContract,
  ]);

  if (
    thresholdReadError instanceof Error &&
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
        Number(resolvedThreshold ?? 0n),
        Number(updatedConviction),
        Number(proposalData?.stakedAmount),
        alphaDecay,
      ),
    [resolvedThreshold, updatedConviction, proposalData?.stakedAmount],
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
      initialized && resolvedThreshold != null ?
        calculatePercentageBigInt(
          resolvedThreshold,
          BigInt(proposalData.strategy.maxCVSupply),
        )
      : undefined,
    [
      resolvedThreshold,
      proposalData?.strategy.maxCVSupply,
      token?.decimals,
      initialized,
    ],
  );

  const isThresholdBelowDisplayPrecision = useMemo(() => {
    if (!initialized || resolvedThreshold == null || resolvedThreshold <= 0n) {
      return false;
    }

    const maxCvSupply = BigInt(proposalData.strategy.maxCVSupply ?? 0);
    return maxCvSupply > 0n && resolvedThreshold * 10000n < maxCvSupply;
  }, [initialized, proposalData?.strategy.maxCVSupply, resolvedThreshold]);

  const hasReachedThreshold = useMemo(
    () =>
      initialized && resolvedThreshold != null && updatedConviction != null ?
        BigInt(updatedConviction.toString()) >= resolvedThreshold
      : undefined,
    [initialized, resolvedThreshold, updatedConviction],
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
    thresholdFromContract: resolvedThreshold,
    totalSupportPct,
    currentConvictionPct,
  });

  return initialized ?
      {
        thresholdPct,
        isThresholdBelowDisplayPrecision,
        hasReachedThreshold,
        totalSupportPct,
        currentConvictionPct,
        updatedConviction,
        timeToPass,
        triggerConvictionRefetch: () => {
          void readConvictionData();
        },
      }
    : {
        hasReachedThreshold: undefined,
        thresholdPct: undefined,
        isThresholdBelowDisplayPrecision: undefined,
        totalSupportPct: undefined,
        currentConvictionPct: undefined,
        updatedConviction: undefined,
        timeToPass: undefined,
      };
};
