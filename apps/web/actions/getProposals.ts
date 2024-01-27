// import { wagmiConfig } from "@/configs/wagmiConfig";
import { readContract, readContracts } from "@wagmi/core";
import { alloAbi, cvStrategyAbi } from "@/src/generated";
import { Abi } from "viem";
import { contractsAddresses } from "@/constants/contracts";

const proposalsIds = [1, 2, 3];

type PoolData = {
  profileId: `0x${string}`;
  strategy: `0x${string}`;
  token: `0x${string}`;
  metadata: { protocol: bigint; pointer: string };
  managerRole: `0x${string}`;
  adminRole: `0x${string}`;
};

type ProposalsMock = {
  title: string;
  type: "funding" | "streaming" | "signaling";
  description: string;
  value: number;
  id: number;
};

type UnparsedProposal = {
  submitter: `0x${string}`;
  beneficiary: `0x${string}`;
  requestedToken: `0x${string}`;
  requestedAmount: number;
  stakedTokens: number;
  proposalType: any;
  proposalStatus: any;
  blockLast: number;
  convictionLast: number;
  agreementActionId: number;
  threshold: number;
  voterStakedPointsPct: number;
};

type Proposal = UnparsedProposal & ProposalsMock;

export async function getProposals(
  accountAddress: `0x${string}`,
  strategyAddress: `0x${string}`,
  poolId: number,
) {
  try {
    // const poolData = (await readContract(wagmiConfig, {
    //   address: contractsAddresses.allo,
    //   abi: alloAbi as Abi,
    //   functionName: "getPool",
    //   args: [BigInt(poolId)],
    // })) as PoolData;

    const alloContractReadProps = {
      account: accountAddress,
      address: strategyAddress,
      abi: cvStrategyAbi as Abi,
      functionName: "getProposal",
    };

    const contractsToRead = proposalsIds.map((proposalId) => ({
      ...alloContractReadProps,
      args: [proposalId],
    }));

    const proposalsReadsContract = await readContracts({
      contracts: contractsToRead,
    });
    // console.log(proposalsReadsContract);
    let transformedProposals: UnparsedProposal[] = [];

    proposalsReadsContract.forEach((proposal) => {
      if (proposal !== undefined)
        transformedProposals.push(transformData(proposal.result as any[]));
    });

    // Merge the additional data from proposalsMock based on the index
    const parsedProposals: Proposal[] = transformedProposals.map(
      (proposal, index) => ({
        ...proposal,
        ...fundingProposals[index],
      }),
    );

    return parsedProposals;
  } catch (error) {
    console.log(error);
  }
}

function transformData(data: any[]): UnparsedProposal {
  return {
    submitter: data[0],
    beneficiary: data[1],
    requestedToken: data[2],
    requestedAmount: Number(data[3]),
    stakedTokens: Number(data[4]),
    proposalType: data[5],
    proposalStatus: data[6],
    blockLast: Number(data[7]),
    convictionLast: Number(data[8]),
    agreementActionId: Number(data[9]),
    threshold: Number(data[10]),
    voterStakedPointsPct: Number(data[11]),
  };
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
