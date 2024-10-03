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
  const cvStrategyContract = {
    address: proposalData?.strategy.id as Address,
    abi: cvStrategyABI,
    chainId: chainIdFromPath,
    enabled: !!proposalData,
  };

  //const blockNumber = useBlockNumber();
  //const timePassed = BigInt(blockNumber?.data ?? 0n) - (blockLast ?? 0n);

  //new way of getting conviction from contract
  // const { data: convictionFromContract, error: errorConviction } =
  //   useContractRead({
  //     ...cvStrategyContract,
  //     functionName: "calculateConviction",
  //     args: [
  //       timePassed,
  //       proposalData?.convictionLast,
  //       proposalData?.stakedAmount,
  //     ],
  //     enabled: enabled,
  //   });

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

  if (!proposalData || updatedConviction == null) {
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
  };
};
