import { ProposalMetadata } from "#/subgraph/.graphclient";
import { LightCVStrategy } from "@/types";
import { fetchIpfs } from "@/utils/ipfsUtils";

export async function getProposals(strategy: LightCVStrategy) {
  try {
    const fetchIPFSDataBatch = async function (
      proposals: (typeof strategy)["proposals"],
      batchSize = 5,
      delay = 300,
    ) {
      // Introduce a delay
      const sleep = (ms: number) =>
        new Promise((resolve) => setTimeout(resolve, ms));

      // Create proposal chunks
      const chunks = Array.from(
        { length: Math.ceil(proposals.length / batchSize) },
        (_, i) => proposals.slice(i * batchSize, i * batchSize + batchSize),
      );

      // Process each chunk
      let results: Array<Pick<ProposalMetadata, "title" | "description">> = [];
      for (const chunk of chunks) {
        chunk.forEach(async (p) => {
          if (p.metadata) {
            results.push(p.metadata);
          } else {
            const ipfsRes = await fetchIpfs<(typeof results)[number] | null>(
              p.metadataHash,
            );
            if (ipfsRes) {
              results.push(ipfsRes);
            }
          }
        });
        await sleep(delay);
      }

      return results;
    };

    const proposalsData = await fetchIPFSDataBatch(strategy.proposals);
    const transformedProposals = proposalsData
      .map((data, index) => {
        const p = strategy.proposals[index];
        return {
          ...p,
          voterStakedPointsPct: 0,
          metadata: {
            title: data.title,
            description: data.description,
          },
          stakedAmount: strategy.proposals[index].stakedAmount,
          type: strategy.config?.proposalType as number,
          status: strategy.proposals[index].proposalStatus,
        };
      })
      .sort((a, b) => +a.proposalNumber - +b.proposalNumber); // Sort by proposal number ascending

    return transformedProposals;
  } catch (error) {
    console.error("Error while getting proposal ipfs metadata", error);
  }
}
