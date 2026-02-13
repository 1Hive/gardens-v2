import { useMemo } from "react";
import { Address, useContractRead, useContractReads } from "wagmi";
import {
  CVProposal,
  CVStrategy,
  CVStrategyConfig,
  Maybe,
  TokenGarden,
} from "#/subgraph/.graphclient";
import { useChainFromPath } from "./useChainFromPath";
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
  enabled = true,
}: {
  proposalData: ProposalDataLight | undefined;
  strategyConfig: Pick<CVStrategyConfig, "decay" | "proposalType"> | undefined;
  tokenData: Maybe<Pick<TokenGarden, "decimals">> | undefined;
  enabled?: boolean;
}) => {
  const chain = useChainFromPath();

  const cvStrategyContract = {
    address: proposalData?.strategy.id as Address,
    abi: cvStrategyABI,
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
    watch: true,
  });

  if (errorConviction) {
    logOnce("error", "Error reading conviction", errorConviction);
  }
  const shouldReadThreshold =
    enabled && PoolTypes[strategyConfig?.proposalType] === "funding";

  const { data: thresholdReads } = useContractReads({
    allowFailure: true,
    contracts:
      shouldReadThreshold ?
        [
          {
            ...cvStrategyContract,
            functionName: "calculateThreshold",
            args: [proposalData?.requestedAmount ?? 0],
          },
        ]
      : [],
    enabled: shouldReadThreshold,
  });

  const thresholdRes = thresholdReads?.[0];

  if (
    thresholdRes?.error &&
    thresholdRes.error.message.includes("AmountOverMaxRatio") === false
  ) {
    logOnce(
      "error",
      "Error reading threshold from contract",
      thresholdRes?.error,
    );
  }

  const thresholdFromContract = thresholdRes?.result;

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
        triggerConvictionRefetch: () => triggerConvictionRefetch(),
      }
    : {
        thresholdPct: undefined,
        totalSupportPct: undefined,
        currentConvictionPct: undefined,
        updatedConviction: undefined,
        timeToPass: undefined,
      };
};
