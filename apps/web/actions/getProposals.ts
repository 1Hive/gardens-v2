import { readContracts } from "@wagmi/core";
import { cvStrategyABI } from "@/src/generated";
import { Abi, Address } from "viem";
import { Proposal, ProposalTypeVoter, Strategy } from "@/components/Proposals";
import { CVProposal } from "#/subgraph/.graphclient";

export const PRECISION_SCALE = BigInt(10 ** 4);
// 100 * PRECISION_SCALE = 100%
// 950.000 / PRECISION_SCALE = 95%

// const pts = 100000;
//use PRECISION_SCALE & registerStakeAmount, etc to parse data so you get a number between 0% and 100%

export async function getProposals(
  accountAddress: Address | undefined,
  strategy: Strategy,
) {
  try {
    async function fetchIPFSDataBatch(
      proposals: Proposal[],
      batchSize = 5,
      delay = 300,
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

      console.log(proposalsReadsContract);

      transformedProposals.map((proposal, i) => {
        if (proposalsReadsContract[i]?.result !== undefined) {
          const result = proposalsReadsContract[i].result as {
            voterStakedPoints: bigint;
          };
          const voterStakedPointsPct =
            result?.voterStakedPoints / PRECISION_SCALE;
          return { ...proposal, voterStakedPointsPct: voterStakedPointsPct };
        }
      });
    }

    return transformedProposals;
  } catch (error) {
    console.log(error);
  }
}
