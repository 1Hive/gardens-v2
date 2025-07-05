import { useMemo } from "react";
import { createClient, fetchExchange, gql } from "urql";
import { useChainFromPath } from "./useChainFromPath";
import { chainConfigMap } from "@/configs/chains";
import { ChainId } from "@/types";

export function useSuperfluidSugraphClient(props?: { chainId?: ChainId }) {
  const chain = useChainFromPath();
  const resolvedChain = props?.chainId ? chainConfigMap[props.chainId] : chain;
  const client = useMemo(() => {
    if (!resolvedChain) return null;
    const superfluidSubgraphUrl =
      resolvedChain.publishedSuperfluidSubgraphUrl ??
      resolvedChain.superfluidSubgraphUrl;
    if (!superfluidSubgraphUrl) return null;
    return createClient({
      url: superfluidSubgraphUrl!,
      exchanges: [/* cacheExchange, authExchange, */ fetchExchange],
    });
  }, [resolvedChain]);

  return client;
}
