import { zeroAddress } from "viem";
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
import { getRemainingBlocksToPass } from "@/utils/convictionFormulas";
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
    | "blockLast"
  > & {
    strategy: Pick<
      CVStrategy,
      "id" | "maxCVSupply" | "totalEffectiveActivePoints"
      //need the pool.config.decay (alpha)
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
  const chainIdFromPath = useChainIdFromPath();
  const chain = useChainFromPath();

  const cvStrategyContract = {
    address: (proposalData?.strategy.id ?? zeroAddress) as Address,
    abi: cvStrategyABI,
    chainId: chainIdFromPath,
    enabled: !!proposalData,
  };

  const { data: updatedConviction, error: errorConviction } = useContractRead({
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

  if (errorThreshold) {
    logOnce("error", "Error reading threshold", errorThreshold);
  }

  if (errorConviction) {
    logOnce("error", "Error reading conviction", errorConviction);
  }

  if (!enabled) {
    return {
      thresholdPct: undefined,
      totalSupportPct: undefined,
      currentConvictionPct: undefined,
      updatedConviction: undefined,
    };
  }

  if (!proposalData || updatedConviction == null || chain == undefined) {
    return {
      thresholdPct: undefined,
      totalSupportPct: undefined,
      currentConvictionPct: undefined,
      updatedConviction: undefined,
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

  const blockTime = chain.blockTime;

  const remainingBlocks = getRemainingBlocksToPass(
    Number(thresholdFromContract),
    Number(updatedConviction),
    Number(proposalData.stakedAmount),
    0.9998876,
  );

  const timeToPass = Date.now() / 1000 + remainingBlocks * blockTime;

  // console.log({
  //   convictionFromContract,
  //   updatedConviction,
  //   convictionLast,
  //   maxCVSupply: proposalData.strategy.maxCVSupply,
  //   stakedAmount: proposalData.stakedAmount,
  //   totalEffectiveActivePoints:
  //     proposalData.strategy.totalEffectiveActivePoints,
  // });

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
  };
};
