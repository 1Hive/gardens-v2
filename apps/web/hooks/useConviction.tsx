import { useContractRead, useContractReads, useAccount } from "wagmi";
import { useState, useEffect, use } from "react";
import { Abi } from "viem";
import { contractsAddresses } from "@/constants/contracts";
import { alloABI, cvStrategyABI } from "@/src/generated";
import { formatEther } from "viem";
import { useProposalsRead } from "./useProposalsRead";

export const useConviction = () => {
  const [data, setData] = useState([]);

  const proposalId = 1;
  const { proposals } = useProposalsRead({ poolId: Number(1) });

  const proposalsReadsContract = proposals?.filter(
    (proposal) => proposal.id === Number(proposalId),
  );

  console.log(proposalsReadsContract);

  const { threshold, convictionLast } = proposalsReadsContract?.[0];

  return { data: data };
};
//for user convert stakedTokens to points 1 point = 1% 100% = 50HNY StakedBasisAmaount IN REGISTRY CONTRACT
// tokens needed: means u need 5.7 % of the effective supply to pass the proposal => tokens need
//  contract --- getMaxConviction => we need the alpha, is the decay variable from the contacts, weight is rho,
//max ratio is beta
//get max conviction => max conviction possible based on the supply
//convitinLast is the current conviction fetcn in getPrposals
// 1% == 1 points

//getPrposals => thersohold, convictinlast
//totaleeffectiveactivepoints => same
//getMaxConviction => passed to , maxCVsuPPPLY
//MAX CONVICTION => getprpposalStakedAmount (proposalid) > maxCVconvciton
//

//updatepRPPOSALcoNVICTION
