import { Address } from "viem";
import { base } from "viem/chains";

const MARKEE_SUBGRAPH_ID = "8kMCKUHSY7o6sQbsvufeLVo8PifxrsnagjVTMGcs6KdF";
const SUBGRAPH_GATEWAY_KEY = process.env.NEXT_PUBLIC_SUBGRAPH_KEY;

const MARKEE_STUDIO_URL =
  "https://api.studio.thegraph.com/query/1742437/markee-base/version/latest";
const MARKEE_GATEWAY_URL =
  SUBGRAPH_GATEWAY_KEY ?
    `https://gateway.thegraph.com/api/${SUBGRAPH_GATEWAY_KEY}/subgraphs/id/${MARKEE_SUBGRAPH_ID}`
  : undefined;

export const MARKEE_SUBGRAPH_URL = MARKEE_GATEWAY_URL ?? MARKEE_STUDIO_URL;

export const GARDENS_STRATEGY =
  "0x346419315740F085Ba14cA7239D82105a9a2BDBE" as Address;
export const MarkeeNetwork = base;

export type MarkeeEntry = {
  message: string;
  name: string;
  totalFundsAdded: string;
};

type MarkeeSubgraphResponse = {
  data?: {
    topDawgPartnerStrategy?: {
      minimumPrice?: string;
      markees?: MarkeeEntry[];
    } | null;
  };
  errors?: unknown;
};

async function postMarkeeQuery(query: string): Promise<MarkeeSubgraphResponse> {
  const urls = [MARKEE_GATEWAY_URL, MARKEE_STUDIO_URL].filter(
    (url): url is string => Boolean(url),
  );
  let lastError: Error | undefined;

  for (const url of urls) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        throw new Error(
          `Subgraph request failed with ${response.status} at ${url}`,
        );
      }

      const result = (await response.json()) as MarkeeSubgraphResponse;
      if (result.errors) {
        throw new Error(
          `Subgraph returned GraphQL errors at ${url}: ${JSON.stringify(result.errors)}`,
        );
      }

      return result;
    } catch (error) {
      lastError = error as Error;
    }
  }

  throw lastError ?? new Error(`Failed to query Markee subgraph (attempted URLs: ${urls.join(", ")})`);
}

export async function fetchMarkeeSignData(strategyAddress: Address) {
  const strategyId = strategyAddress.toLowerCase();
  const result = await postMarkeeQuery(`{
    topDawgPartnerStrategy(id: "${strategyId}") {
      minimumPrice
      markees(first: 1, orderBy: totalFundsAdded, orderDirection: desc) {
        message
        name
        totalFundsAdded
      }
    }
  }`);

  return result.data?.topDawgPartnerStrategy ?? null;
}

export async function fetchMarkeeLeaderboard(strategyAddress: Address) {
  const strategyId = strategyAddress.toLowerCase();
  const result = await postMarkeeQuery(`{
    topDawgPartnerStrategy(id: "${strategyId}") {
      markees(first: 10, orderBy: totalFundsAdded, orderDirection: desc) {
        message
        name
        totalFundsAdded
      }
    }
  }`);

  return result.data?.topDawgPartnerStrategy?.markees ?? [];
}
