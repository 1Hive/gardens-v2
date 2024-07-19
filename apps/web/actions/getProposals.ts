import { Address } from "viem";
import { LightCVStrategy, LightProposal } from "@/types";

export async function getProposals(
  accountAddress: Address | undefined,
  strategy: LightCVStrategy,
) {
  try {
    const fetchIPFSDataBatch = async function (
      proposals: LightProposal[],
      batchSize = 5,
      delay = 300,
    ) {
      // Fetch data for a batch of proposals
      const fetchBatch = async (batch: any) =>
        Promise.all(
          batch.map((p: LightProposal) =>
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
    };

    const transformProposals = async function (_strategy: LightCVStrategy) {
      const proposalsData = await fetchIPFSDataBatch(_strategy.proposals);
      const transformedProposals = proposalsData.map((data, index) => {
        const p = _strategy.proposals[index];
        return {
          ...p,
          voterStakedPointsPct: 0,
          stakedAmount: _strategy.proposals[index].stakedAmount,
          title: data.title,
          type: _strategy.config?.proposalType as number,
          status: _strategy.proposals[index].proposalStatus,
        };
      });

      return transformedProposals;
    };
    let transformedProposals = await transformProposals(strategy);

    return transformedProposals;
  } catch (error) {
    console.error(error);
  }
}
