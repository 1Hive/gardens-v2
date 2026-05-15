import { print, type DocumentNode, type ExecutionResult } from "graphql";
import { type ChainData } from "@/configs/chains";

type QueryByChainContext = {
  fetchOptions?: RequestInit | (() => RequestInit);
  requestPolicy?: string;
  url?: string;
};

type QueryByChainResult<Data> = ExecutionResult<Data> & {
  error?: Error;
};

function resolveQueryDocument(
  query: string | DocumentNode | { toString(): string },
) {
  if (typeof query === "string") {
    return query;
  }

  if ("kind" in query) {
    return print(query);
  }

  return query.toString();
}

export async function queryByChain<
  Data = unknown,
  Variables extends Record<string, unknown> = Record<string, unknown>,
>(
  chain: Pick<ChainData, "subgraphUrl" | "publishedSubgraphUrl">,
  query: string | DocumentNode | { toString(): string },
  variables: Variables = {} as Variables,
  context?: QueryByChainContext,
  skipPublished?: boolean,
): Promise<QueryByChainResult<Data>> {
  if (chain == null) {
    throw new Error("Chain not supported");
  }

  const fetchOptions =
    typeof context?.fetchOptions === "function" ?
      context.fetchOptions()
    : context?.fetchOptions;
  const response = await fetch(
    context?.url ??
      (skipPublished || !chain.publishedSubgraphUrl ?
        chain.subgraphUrl
      : chain.publishedSubgraphUrl),
    {
      ...fetchOptions,
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(fetchOptions?.headers ?? {}),
      },
      body: JSON.stringify({
        query: resolveQueryDocument(query),
        variables,
      }),
      cache: "no-store",
    },
  );

  const result = (await response.json()) as QueryByChainResult<Data>;

  if (!response.ok) {
    const message =
      result.errors?.map((error) => error.message).join("; ") ||
      `Subgraph request failed with status ${response.status}`;
    return {
      ...result,
      error: new Error(message),
    };
  }

  if (result.errors?.length) {
    return {
      ...result,
      error: new Error(result.errors.map((error) => error.message).join("; ")),
    };
  }

  return result;
}
