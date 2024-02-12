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
    const proposalsIds = strategy.proposals.map((proposal) => proposal.id);
    const proposalTypeStr = getProposalTypeString(
      strategy.config?.proposalType as number,
    );

    let transformedProposals: ProposalTypeVoter[] = strategy.proposals.map(
      (p) => {
        return {
          ...p,
          voterStakedPointsPct: 0,
          title: "title", //@todo get from IPFS using p.metadata
          type: proposalTypeStr,
        };
      },
    );

    // console.log("transformedProposals", transformedProposals);
    if (accountAddress) {
      transformedProposals = [];
      const alloContractReadProps = {
        address: strategy.id as Address,
        abi: cvStrategyABI as Abi,
        functionName: "getProposalVoterStakedPointsPct",
      };

      const contractsToRead = proposalsIds.map((proposalId) => ({
        ...alloContractReadProps,
        args: [proposalId, accountAddress],
      }));

      const proposalsReadsContract = await readContracts({
        contracts: contractsToRead,
      });

      proposalsReadsContract.forEach((proposal, i) => {
        // console.log("proposalReadcontractg", proposal);

        if (proposal !== undefined) {
          transformedProposals.push(
            transformData(
              strategy.proposals[i],
              proposal.result === undefined ? 0 : Number(proposal.result),
              proposalTypeStr,
            ),
          );
        }
      });
    }

    return transformedProposals;
  } catch (error) {
    console.log(error);
  }
}

function transformData(
  p: Proposal,
  voterStakedPointsPct: number,
  proposalTypeStr: string,
): ProposalTypeVoter {
  return {
    ...p,
    voterStakedPointsPct,
    title: "title", //@todo get from IPFS using p.metadata
    type: proposalTypeStr,
  };
}
