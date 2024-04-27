import { readContracts } from "@wagmi/core";
import { cvStrategyABI } from "@/src/generated";
import { Abi, Address } from "viem";
import { Proposal, ProposalTypeVoter, Strategy } from "@/components/Proposals";
import { CVProposal } from "#/subgraph/.graphclient";

export const PRECISION_SCALE = BigInt(10 ** 4);
// const pts = 1_000_000 = 100% = 1M;
// 100 * PRECISION_SCALE = 100%
// 950.000 / PRECISION_SCALE = 95%
// use PRECISION_SCALE & registerStakeAmount, etc to parse data so you get a number between 0% and 100%

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
      console.log("STRATEGYYYYYYYY ", strategy);
      const proposalsData = await fetchIPFSDataBatch(strategy.proposals);
      console.log("AAAAAAAAAAAAAAAAAAAAAAAAAAA");
      console.log("PROPOSALS DATA ", proposalsData);
      const transformedProposals = proposalsData.map((data, index) => {
        const p = strategy.proposals[index];
        return {
          ...p,
          voterStakedPointsPct: 0,
          stakedAmount: strategy.proposals[index].stakedAmount,
          title: data.title,
          type: strategy.config?.proposalType as number,
          status: strategy.proposals[index].proposalStatus,
        };
      });

      return transformedProposals;
    }
    console.log("AAAAAAAAAAAAAAAAAAAAAAAAAAA");
    let transformedProposals: ProposalTypeVoter[] =
      await transformProposals(strategy);

    return transformedProposals;
  } catch (error) {
    console.log(error);
  }
}
