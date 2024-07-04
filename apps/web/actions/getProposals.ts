import { LightCVStrategy, LightProposal } from "@/types";

export async function getProposals(strategy: LightCVStrategy) {
  try {
    async function fetchIPFSDataBatch(
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
    }

    async function transformProposals(strategy: LightCVStrategy) {
      const proposalsData = await fetchIPFSDataBatch(strategy.proposals);
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
    let transformedProposals = await transformProposals(strategy);

    return transformedProposals;
  } catch (error) {
    console.log(error);
  }
}
