import { zeroAddress } from "viem";
import { Address, useContractRead } from "wagmi";
import { CVProposal, CVStrategy, Maybe, TokenGarden } from "#/subgraph/.graphclient";
import { cvStrategyABI } from "@/src/generated";
import { logOnce } from "@/utils/log";
import { calculatePercentageBigInt } from "@/utils/numbers";

type ProposalDataLight = Maybe<(Pick<CVProposal, "proposalNumber" | "convictionLast" | "stakedAmount" | "threshold"> & {
  strategy: (Pick<CVStrategy, "id" | "maxCVSupply" | "totalEffectiveActivePoints">);
})>;

export const useConvictionRead = ({ proposalData, tokenData: token }: { proposalData: ProposalDataLight | undefined, tokenData: Maybe<Pick<TokenGarden, "decimals">> | undefined } ) => {
  const cvStrategyContract = {
    address: (proposalData?.strategy.id ?? zeroAddress) as Address,
    abi: cvStrategyABI,
    enabled: !!proposalData,
  };

  const { data: updateConvictionLast } = useContractRead({
    ...cvStrategyContract,
    functionName: "updateProposalConviction" as any, // TODO: fix CVStrategy.updateProposalConviction to view in contract
    args: [BigInt(proposalData?.proposalNumber ?? 0)],
  });

  if (!proposalData || updateConvictionLast == null) {
    return { thresholdPct: undefined, totalSupportPct: undefined, currentConvictionPct: undefined, updateConvictionLast: undefined };
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

  return { thresholdPct, totalSupportPct, currentConvictionPct, updateConvictionLast };
};