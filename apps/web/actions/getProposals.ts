import { readContracts } from "@wagmi/core";
import { cvStrategyABI } from "@/src/generated";
import { Abi, Address } from "viem";
import { Proposal, ProposalTypeVoter, Strategy } from "@/components/Proposals";
import { CVProposal } from "#/subgraph/.graphclient";

export async function getProposals(
  accountAddress: Address | undefined,
  strategy: Strategy,
) {
  try {
    async function fetchIPFSDataBatch(
      proposals: Proposal[],
      batchSize = 5,
      delay = 1000,
    ) {
      // Fetch data for a batch of proposals
      const fetchBatch = async (batch: any) =>
        Promise.all(
          batch.map((p: Proposal) =>
            fetch(`https://ipfs.io/ipfs/${p.metadata}`, {
              method: "GET",
              headers: { "content-type": "application/json" },
            }).then((res) => res.json()),
          ),
        );

      // Introduce a delay
      const sleep = (ms: number) =>
        new Promise((resolve) => setTimeout(resolve, ms));

      // Create proposal chunks
      const chunks = Array.from(
        { length: Math.ceil(proposals.length / batchSize) },
        (_, i) => proposals.slice(i * batchSize, i * batchSize + batchSize),
      );

      // Process each chunk
      let results = [];
      for (const chunk of chunks) {
        const batchResults = await fetchBatch(chunk);
        results.push(...batchResults);
        await sleep(delay);
      }

      return results;
    }

    async function transformProposals(strategy: Strategy) {
      const proposalsData = await fetchIPFSDataBatch(strategy.proposals);
      const transformedProposals = proposalsData.map((data, index) => {
        const p = strategy.proposals[index];
        return {
          ...p,
          voterStakedPointsPct: 0,
          title: data.title,
          type: strategy.config?.proposalType as number,
        };
      });

      return transformedProposals;
    }

    let transformedProposals: ProposalTypeVoter[] =
      await transformProposals(strategy);

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
