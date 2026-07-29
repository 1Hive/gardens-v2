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
import { getRemainingBlocksToPassWithThresholdDecay } from "@/utils/convictionFormulas";
import { logOnce } from "@/utils/log";
import { calculatePercentageBigInt, CV_SCALE_PRECISION } from "@/utils/numbers";

export type ProposalDataLight = Maybe<
  Pick<
    CVProposal,
    | "proposalNumber"
    | "stakedAmount"
    | "requestedAmount"
    | "beneficiary"
    | "convictionLast"
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
  const [updatedStakedAmount, setUpdatedStakedAmount] = useState<bigint>();
  const [updatedTotalPointsActivated, setUpdatedTotalPointsActivated] =
    useState<bigint>();
  const [proposalThreshold, setProposalThreshold] = useState<bigint>();
  const [stableThreshold, setStableThreshold] = useState<bigint>();
  const [errorConviction, setErrorConviction] = useState<unknown>();
  const [errorStakedAmount, setErrorStakedAmount] = useState<unknown>();
  const [errorTotalPointsActivated, setErrorTotalPointsActivated] =
    useState<unknown>();
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
  const shouldReadThreshold = shouldReadConviction && poolType !== "signaling";

  const readConvictionData = useCallback(async () => {
    if (!shouldReadConviction || !readClient || !cvStrategyContract.address) {
      setUpdatedConviction(undefined);
      setUpdatedStakedAmount(undefined);
      setUpdatedTotalPointsActivated(undefined);
      setProposalThreshold(undefined);
      setStableThreshold(undefined);
      return;
    }

    const [
      convictionResult,
      proposalResult,
      totalPointsActivatedResult,
      stableThresholdResult,
    ] = await Promise.allSettled([
      readClient.readContract({
        ...cvStrategyContract,
        functionName: "calculateProposalConviction",
        args: [proposalNumber],
      }),
      readClient.readContract({
        ...cvStrategyContract,
        functionName: "getProposal",
        args: [proposalNumber],
      }),
      readClient.readContract({
        ...cvStrategyContract,
        functionName: "totalPointsActivated",
      }),
      shouldReadThreshold ?
        readClient.readContract({
          ...cvStrategyContract,
          functionName: "calculateThreshold",
          args: [requestedAmount],
        })
      : Promise.resolve(undefined),
    ]);

    if (convictionResult.status === "fulfilled") {
      setUpdatedConviction(convictionResult.value as bigint);
      setErrorConviction(undefined);
    } else {
      setUpdatedConviction(undefined);
      setErrorConviction(convictionResult.reason);
    }

    if (proposalResult.status === "fulfilled") {
      const proposal = proposalResult.value as readonly unknown[];
      setUpdatedStakedAmount(proposal[4] as bigint);
      setErrorStakedAmount(undefined);

      if (shouldReadThreshold) {
        setProposalThreshold(proposal[8] as bigint);
        setThresholdReadError(undefined);
      } else {
        setProposalThreshold(undefined);
        setThresholdReadError(undefined);
      }
    } else {
      setUpdatedStakedAmount(undefined);
      setProposalThreshold(undefined);
      setErrorStakedAmount(proposalResult.reason);
      setThresholdReadError(
        shouldReadThreshold ? proposalResult.reason : undefined,
      );
    }

    if (totalPointsActivatedResult.status === "fulfilled") {
      setUpdatedTotalPointsActivated(
        totalPointsActivatedResult.value as bigint,
      );
      setErrorTotalPointsActivated(undefined);
    } else {
      setUpdatedTotalPointsActivated(undefined);
      setErrorTotalPointsActivated(totalPointsActivatedResult.reason);
    }

    if (shouldReadThreshold && stableThresholdResult.status === "fulfilled") {
      setStableThreshold(stableThresholdResult.value as bigint);
    } else {
      setStableThreshold(undefined);
    }
  }, [
    cvStrategyContract.address,
    proposalNumber,
    readClient,
    requestedAmount,
    shouldReadConviction,
    shouldReadThreshold,
  ]);

  useEffect(() => {
    if (!shouldReadConviction || !readClient) {
      setUpdatedConviction(undefined);
      setUpdatedStakedAmount(undefined);
      setUpdatedTotalPointsActivated(undefined);
      setProposalThreshold(undefined);
      setStableThreshold(undefined);
      setErrorConviction(undefined);
      setErrorStakedAmount(undefined);
      setErrorTotalPointsActivated(undefined);
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

  if (errorStakedAmount) {
    logOnce("error", "Error reading proposal support", errorStakedAmount);
  }

  if (errorTotalPointsActivated) {
    logOnce(
      "error",
      "Error reading total activated proposal support",
      errorTotalPointsActivated,
    );
  }

  const resolvedStakedAmount =
    updatedStakedAmount ?? BigInt(proposalData?.stakedAmount ?? 0);
  const resolvedConviction =
    updatedConviction ?? BigInt(proposalData?.convictionLast ?? 0);
  const resolvedTotalEffectiveActivePoints =
    updatedTotalPointsActivated ??
    BigInt(proposalData?.strategy.totalEffectiveActivePoints ?? 0);
  const resolvedMaxCVSupply = useMemo(() => {
    if (updatedTotalPointsActivated == null) {
      return BigInt(proposalData?.strategy.maxCVSupply ?? 0);
    }
    const decay = BigInt(strategyConfig?.decay ?? 0);
    const precision = BigInt(CV_SCALE_PRECISION);
    if (decay >= precision) {
      return BigInt(proposalData?.strategy.maxCVSupply ?? 0);
    }
    return (updatedTotalPointsActivated * precision) / (precision - decay);
  }, [
    proposalData?.strategy.maxCVSupply,
    strategyConfig?.decay,
    updatedTotalPointsActivated,
  ]);

  const resolvedThreshold = useMemo(() => {
    if (!shouldReadThreshold) {
      return undefined;
    }

    return proposalThreshold;
  }, [proposalThreshold, shouldReadThreshold]);
  const resolvedStableThreshold = useMemo(
    () => stableThreshold ?? resolvedThreshold,
    [resolvedThreshold, stableThreshold],
  );

  if (
    thresholdReadError instanceof Error &&
    thresholdReadError.message.includes("AmountOverMaxRatio") === false
  ) {
    logOnce(
      "error",
      "Error reading proposal threshold from contract",
      thresholdReadError,
    );
  }

  // calculate time to pass for proposal te be executed
  const alphaDecay = +strategyConfig?.decay / CV_SCALE_PRECISION;

  const remainingBlocksToPass = useMemo(
    () =>
      getRemainingBlocksToPassWithThresholdDecay(
        Number(resolvedThreshold ?? 0n),
        Number(resolvedStableThreshold ?? resolvedThreshold ?? 0n),
        Number(resolvedConviction),
        Number(resolvedStakedAmount),
        alphaDecay,
      ),
    [
      alphaDecay,
      resolvedConviction,
      resolvedStableThreshold,
      resolvedStakedAmount,
      resolvedThreshold,
    ],
  );
  const blockTime = chain?.blockTime;

  const initialized =
    proposalData && chain != null && strategyConfig && enabled;

  const timeToPass =
    initialized ?
      Date.now() / 1000 + remainingBlocksToPass * (blockTime ?? 0)
    : undefined;

  let thresholdPct = useMemo(
    () =>
      initialized && resolvedThreshold != null ?
        calculatePercentageBigInt(resolvedThreshold, resolvedMaxCVSupply)
      : undefined,
    [resolvedThreshold, resolvedMaxCVSupply, token?.decimals, initialized],
  );
  const stableThresholdPct = useMemo(
    () =>
      initialized && resolvedStableThreshold != null ?
        calculatePercentageBigInt(resolvedStableThreshold, resolvedMaxCVSupply)
      : undefined,
    [
      initialized,
      resolvedMaxCVSupply,
      resolvedStableThreshold,
      token?.decimals,
    ],
  );

  const isThresholdBelowDisplayPrecision = useMemo(() => {
    if (!initialized || resolvedThreshold == null || resolvedThreshold <= 0n) {
      return false;
    }

    const maxCvSupply = resolvedMaxCVSupply;
    return maxCvSupply > 0n && resolvedThreshold * 10000n < maxCvSupply;
  }, [initialized, resolvedMaxCVSupply, resolvedThreshold]);

  const hasReachedThreshold = useMemo(
    () =>
      initialized && resolvedThreshold != null ?
        resolvedConviction > resolvedThreshold
      : undefined,
    [initialized, resolvedThreshold, resolvedConviction],
  );
  const willReachThreshold = useMemo(() => {
    if (
      !initialized ||
      resolvedStableThreshold == null ||
      resolvedStakedAmount == null
    ) {
      return undefined;
    }

    const decay = BigInt(strategyConfig?.decay ?? 0);
    const precision = BigInt(CV_SCALE_PRECISION);
    if (decay >= precision) return false;

    const maxProposalConviction =
      (resolvedStakedAmount * precision) / (precision - decay);
    return maxProposalConviction > resolvedStableThreshold;
  }, [
    initialized,
    resolvedStableThreshold,
    resolvedStakedAmount,
    strategyConfig?.decay,
  ]);

  let totalSupportPct = useMemo(
    () =>
      initialized ?
        calculatePercentageBigInt(
          resolvedStakedAmount,
          resolvedTotalEffectiveActivePoints,
        )
      : undefined,
    [
      resolvedStakedAmount,
      resolvedTotalEffectiveActivePoints,
      token?.decimals,
      initialized,
    ],
  );

  let currentConvictionPct = useMemo(
    () =>
      initialized ?
        calculatePercentageBigInt(resolvedConviction, resolvedMaxCVSupply)
      : undefined,
    [resolvedConviction, resolvedMaxCVSupply, token?.decimals, initialized],
  );

  logOnce("debug", "Conviction computed numbers", {
    thresholdPct,
    proposalThreshold: resolvedThreshold,
    stableThreshold: resolvedStableThreshold,
    stableThresholdPct,
    totalSupportPct,
    currentConvictionPct,
  });

  return initialized ?
      {
        thresholdPct,
        stableThresholdPct,
        isThresholdBelowDisplayPrecision,
        hasReachedThreshold,
        willReachThreshold,
        totalSupportPct,
        currentConvictionPct,
        updatedConviction: resolvedConviction,
        timeToPass,
        triggerConvictionRefetch: () => {
          void readConvictionData();
        },
      }
    : {
        hasReachedThreshold: undefined,
        willReachThreshold: undefined,
        thresholdPct: undefined,
        stableThresholdPct: undefined,
        isThresholdBelowDisplayPrecision: undefined,
        totalSupportPct: undefined,
        currentConvictionPct: undefined,
        updatedConviction: undefined,
        timeToPass: undefined,
      };
};
