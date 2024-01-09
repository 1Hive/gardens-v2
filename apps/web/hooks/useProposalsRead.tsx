import { useContractRead, useContractReads } from "wagmi";
import { useState, useEffect } from "react";
import { Abi } from "viem";
import { contractsAddresses } from "@/constants/contracts";
import { alloABI, cvStrategyABI } from "@/src/generated";

export const useProposalsRead = ({ poolId }: { poolId: number }) => {
  const [strategyAddress, setStrategyAddress] = useState<`0x${string}`>();

  const { data, error: poolError } = useContractRead({
    address: contractsAddresses.allo,
    abi: alloABI as Abi,
    functionName: "getPool",
    args: [BigInt(poolId)],
    watch: true,
    onError: (error) => {
      console.log(error);
    },
    onSuccess: (data: { strategy: `0x${string}` }) => {
      if (data) {
        setStrategyAddress(data?.strategy);
      }
    },
  });

  //get the proposals data based on strategy address
  const alloContractReads = {
    address: strategyAddress,
    abi: cvStrategyABI as Abi,
    functionName: "getProposal",
  };

  const { data: proposalsReadsContract, isLoading: proposalsLoading } =
    useContractReads({
      contracts: [
        {
          ...alloContractReads,
          args: [1],
        },
        {
          ...alloContractReads,
          args: [2],
        },
        {
          ...alloContractReads,
          args: [3],
        },
      ],
    });

  // parse the proposals data from contract into object with keys and values
  const transformedProposals: Proposal[] =
    proposalsReadsContract?.map((proposal) =>
      transformData(proposal.result as string[]),
    ) ?? [];

  // Choose between proposalsMock and proposalsMock2 based on poolId
  const selectedProposalsMock =
    poolId === 1 ? fundingProposals : signalingProposals;

  // Merge the additional data from proposalsMock based on the index
  const proposals = transformedProposals.map((proposal, index) => ({
    ...proposal,
    ...selectedProposalsMock[index],
  }));

  return { proposals, proposalsLoading };
};

type Proposal = {
  proposalId: bigint;
  requestedAmount: number;
  stakedAmount: number;
  convictionLast: number;
  agreementActionId: number;
  beneficiary: string;
  createdBy: string;
  requestedToken: string;
  blockLast: bigint;
  proposalStatus?: any; // !defined
  proposalType?: any; //  !defined
};

function transformData(data: string[]): Proposal {
  return {
    proposalId: BigInt(data[0]),
    requestedAmount: Number(data[3]),
    stakedAmount: Number(data[4]),
    convictionLast: Number(data[7]),
    agreementActionId: Number(data[5]),
    beneficiary: data[1],
    createdBy: data[0],
    requestedToken: data[2],
    blockLast: BigInt(data[10]),
    // proposalStatus: data, // Update accordingly
    // proposalType: data, // Update accordingly
  };
}
interface ProposalsMock {
  title: string;
  type: "funding" | "streaming" | "signaling";
  description: string;
  value: number;
  id: number;
}

const fundingProposals: ProposalsMock[] = [
  {
    title: "Arbitrum Code Clash - Liquidity Mining Marathon",
    type: "funding",
    description:
      "Dive into the Arbitrum Code Clash! Amplify HoneySwap's liquidity with this thrilling liquidity mining marathon on the Arbitrum Network. Your contribution fuels the coding frenzy and boosts the liquidity ecosystem. Join the clash and let the hackathon excitement begin!",
    value: 10,
    id: 1,
  },
  {
    title: "Zack's Hackathon Hustle - December 2023",
    type: "funding",
    description:
      "Back Zack's Hackathon Hustle for December 2023! Your support propels Zack's coding prowess, innovation, and breakthroughs during this epic hackathon. Let's fund Zack and witness the magic unfold!",
    value: 45,
    id: 2,
  },
  {
    title: "Gardens Swarm - January 2024 Hackathon Surge",
    description:
      "Boost the Gardens Swarm for December 2023! Your contributions power the hackathon spirit, collaboration, and growth of Gardens on the Arbitrum Network. Let's sow the seeds of success in this thrilling hackathon adventure!",
    type: "funding",
    value: 25,
    id: 3,
  },
];
const signalingProposals: ProposalsMock[] = [
  {
    title: "HoneySwap Liquidity Mining Program",
    type: "signaling",
    description:
      "This is a proposal to add liquidity to HoneySwap.This is a proposal to add liquidity to HoneySwap.This is a proposal to add liquidity to HoneySwap.This is a proposal to add liquidity to HoneySwap.This is a proposal to add liquidity to HoneySwap.",
    value: 10,
    id: 1,
  },
  {
    title: "Zack Funding Proposal for the Hackathon",
    type: "signaling",
    description:
      "This is a proposal to fund Zack for the month of December 2023. This is a proposal to fund Zack for the month of December 2023. This is a proposal to fund Zack for the month of December 2023. This is a proposal to fund Zack for the month of December 2023.",
    value: 45,
    id: 2,
  },
  {
    title: "Gardens Swarm January 2024 Funding Proposal",
    description:
      "This is a proposal to fund the Gardens Swarm for the month of December 2023. This is a proposal to fund the Gardens Swarm for the month of December 2023. This is a proposal to fund the Gardens Swarm for the month of December 2023. This is a proposal to fund the Gardens Swarm for the month of December 2023.",
    type: "signaling",
    value: 25,
    id: 3,
  },
];
