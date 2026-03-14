import {
  getStrategyByPoolDocument,
  type getStrategyByPoolQuery,
} from "#/subgraph/.graphclient";
import { chainConfigMap, type ChainData } from "@/configs/chains";
import { queryByChain } from "@/providers/urql";
import { hasEthereumAddressFormat } from "@/utils/web3";

export type SearchParams =
  | Record<string, string | string[] | undefined>
  | undefined;

export async function resolveStrategyAddress(
  chain: string,
  poolSlug: string,
): Promise<string | null> {
  if (!poolSlug) {
    return null;
  }

  if (hasEthereumAddressFormat(poolSlug)) {
    return poolSlug.toLowerCase();
  }

  const numericChain = Number(chain);
  const fallbackChain =
    Number.isFinite(numericChain) ? chainConfigMap[numericChain] : undefined;

  let chainConfig: ChainData | undefined;
  if (chain in chainConfigMap) {
    chainConfig = chainConfigMap[chain as keyof typeof chainConfigMap];
  } else {
    chainConfig = fallbackChain;
  }

  if (!chainConfig) {
    return null;
  }

  const strategyResult = await queryByChain<getStrategyByPoolQuery>(
    chainConfig,
    getStrategyByPoolDocument,
    { poolId: poolSlug },
    { requestPolicy: "network-only" },
    true,
  );

  const strategy = strategyResult?.data?.cvstrategies?.[0];
  return strategy?.id?.toLowerCase() ?? null;
}

export function stringifySearchParams(searchParams: SearchParams): string {
  if (!searchParams) return "";
  const params = new URLSearchParams();
  Object.entries(searchParams).forEach(([key, value]) => {
    if (value == null) return;
    if (Array.isArray(value)) {
      value.forEach((entry) => {
        if (entry != null) {
          params.append(key, entry);
        }
      });
    } else {
      params.append(key, value);
    }
  });
  const query = params.toString();
  return query ? `?${query}` : "";
}
