import { readContracts } from "@wagmi/core";
import { cvStrategyABI } from "@/src/generated";
import { Abi, Address } from "viem";
import { Proposal, ProposalTypeVoter, Strategy } from "@/components/Proposals";

export const getProposalTypeString = (proposalType: number) => {
  const types = ["signaling", "funding", "streaming"];
  return types[proposalType];
};

export async function getProposals(
  accountAddress: Address | undefined,
  strategy: Strategy,
) {
  try {
    const proposalTypeStr = getProposalTypeString(
      strategy.config?.proposalType as number,
    );

    let transformedProposals: ProposalTypeVoter[] = await Promise.all(
      strategy.proposals.map(async (p) => {
        const ipfsRawData = await fetch(`https://ipfs.io/ipfs/${p.metadata}`, {
          method: "GET",
          headers: {
            "content-type": "application/json",
          },
        });
        const ipfsData = await ipfsRawData.json();
        const title = ipfsData.title;

        return {
          ...p,
          voterStakedPointsPct: BigInt(0),
          title: title,
          type: proposalTypeStr,
        };
      }),
    );

    if (accountAddress) {
      const alloContractReadProps = {
        address: strategy.id as Address,
        abi: cvStrategyABI as Abi,
        functionName: "getProposalVoterStakedPointsPct",
      };

      const contractsToRead = transformedProposals.map((proposal) => ({
        ...alloContractReadProps,
        args: [proposal.id, accountAddress],
      }));

      const proposalsReadsContract = await readContracts({
        contracts: contractsToRead,
      });

      transformedProposals.map((proposal, i) => {
        if (proposalsReadsContract[i]?.result !== undefined) {
          const result = proposalsReadsContract[i].result as {
            voterStakedPoints: bigint;
          };
          const voterStakedPointsPct = result?.voterStakedPoints;
          return { ...proposal, voterStakedPointsPct: voterStakedPointsPct };
        }
      });
    }

    return transformedProposals;
  } catch (error) {
    console.log(error);
  }
}
