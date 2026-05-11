import { print, type DocumentNode } from "graphql";
import { type ChainData } from "@/configs/chains";

type GraphQLResult<Data> = {
  data?: Data;
  error?: Error;
};

type QueryInput = string | DocumentNode;

type DocumentTypeDecoration<TResult, TVariables> = {
  __apiType?: (variables: TVariables) => TResult;
};

type ResultOf<T> =
  T extends DocumentTypeDecoration<infer ResultType, unknown> ? ResultType
  : unknown;

type VariablesOf<T> =
  T extends DocumentTypeDecoration<unknown, infer VariablesType> ? VariablesType
  : unknown;

function getQueryString(query: QueryInput) {
  return typeof query === "string" ? query : print(query);
}

export function queryByChain<Query extends QueryInput>(
  chain: Pick<ChainData, "subgraphUrl" | "publishedSubgraphUrl">,
  query: Query,
  variables?: VariablesOf<Query>,
  context?: unknown,
  skipPublished?: boolean,
): Promise<GraphQLResult<ResultOf<Query>>>;

export function queryByChain<Data = unknown, Variables = unknown>(
  chain: Pick<ChainData, "subgraphUrl" | "publishedSubgraphUrl">,
  query: QueryInput,
  variables?: Variables,
  context?: unknown,
  skipPublished?: boolean,
): Promise<GraphQLResult<Data>>;

export async function queryByChain<Data = unknown, Variables = unknown>(
  chain: Pick<ChainData, "subgraphUrl" | "publishedSubgraphUrl">,
  query: QueryInput,
  variables: Variables = {} as Variables,
  _context?: unknown,
  skipPublished?: boolean,
): Promise<GraphQLResult<Data>> {
  if (chain == null) {
    throw new Error("Chain not supported");
  }

  const url =
    !!skipPublished || !chain.publishedSubgraphUrl ?
      chain.subgraphUrl
    : chain.publishedSubgraphUrl;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      query: getQueryString(query),
      variables,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    return {
      error: new Error(`Subgraph request failed with ${response.status}`),
    };
  }

  const result = (await response.json()) as {
    data?: Data;
    errors?: { message?: string }[];
  };

  if (result.errors?.length) {
    return {
      data: result.data,
      error: new Error(
        result.errors.map((error) => error.message ?? "GraphQL error").join("; "),
      ),
    };
  }

  return { data: result.data };
}
