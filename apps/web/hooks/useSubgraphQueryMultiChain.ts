import {
  AnyVariables,
  CombinedError,
  DocumentInput,
  OperationContext,
} from "@urql/next";
import { getContractsAddrByChain } from "@/constants/contracts";
import { useEffect, useRef, useState } from "react";
import {
  localhost,
  arbitrumSepolia,
  optimismSepolia,
  sepolia,
} from "viem/chains";
import { ChangeEventScope } from "@/pages/api/websocket.api";
import { initUrqlClient } from "@/providers/urql";
import { ChainId } from "@/types";
import {
  SubscriptionId,
  useWebSocketContext,
} from "@/contexts/websocket.context";
import { debounce, isEqual } from "lodash-es";
import { CHANGE_EVENT_MAX_RETRIES } from "@/globals";
import delayAsync from "@/utils/delayAsync";

const allChains: ChainId[] = [
  sepolia.id,
  arbitrumSepolia.id,
  optimismSepolia.id,
];

if (process.env.NODE_ENV === "development") {
  allChains.push(localhost.id);
}

export default function useSubgraphQueryMultiChain<
  Data = any,
  Variables extends AnyVariables = AnyVariables,
>(
  query: DocumentInput<any, Variables>,
  variables: Variables = {} as Variables,
  context?: Partial<OperationContext>,
  changeScopes?: ChangeEventScope[],
) {
  const { connected, subscribe, unsubscribe } = useWebSocketContext();

  const [response, setResponse] = useState<Data[]>();
  const [fetching, setFetching] = useState(true);

  const responseMap = useRef(new Map<ChainId, Data>());
  const errorsMap = useRef(new Map<ChainId, CombinedError>());

  useEffect(() => {
    const init = async () => {
      setFetching(true);
      await fetchDebounce();
      setFetching(false);
    };
    init();
  }, []);

  useEffect(() => {
    if (!changeScopes) {
      return;
    }
    let subscritionId: SubscriptionId;
    if (connected) {
      subscribe(changeScopes, (payload) => {
        console.debug("Received change event", payload);
        fetchDebounce(payload.chainId ? [payload.chainId] : undefined, true);
      });
    }

    return () => {
      if (subscritionId) {
        unsubscribe(subscritionId);
      }
    };
  }, [connected]);

  const fetchDebounce = debounce(
    async (chainsOverride?: ChainId[], retryOnNoChange?: boolean) => {
      const chainSubgraphs = (chainsOverride ?? allChains).map((chain) => ({
        chainId: chain,
        url: getContractsAddrByChain(chain)?.subgraphUrl,
      }));
      await Promise.all(
        chainSubgraphs.map(async ({ chainId, url }, i) => {
          const fetchSubgraphChain = async (retries?: number) => {
            try {
              const fetchQuery = async () => {
                const { urqlClient } = initUrqlClient({
                  chainId: (chainsOverride ?? allChains)[i],
                });
                return await urqlClient.query<Data>(query, variables, {
                  ...context,
                  url,
                  chainId,
                } as OperationContext & { _instance: any });
              };

              const res = await fetchQuery();

              if (res.error) {
                errorsMap.current.set(chainId, res.error);
              } else {
                if (
                  !isEqual(res.data, responseMap.current.get(chainId)) ||
                  retries === undefined ||
                  retries >= CHANGE_EVENT_MAX_RETRIES - 1
                ) {
                  responseMap.current.set(chainId, res.data!);
                } else {
                  console.debug(
                    `Subgraph-${chainId} result not yet updated, retrying with incremental delays... (retry count: ${retries + 1}/${CHANGE_EVENT_MAX_RETRIES})`,
                  );
                  const delay = 2000 * 2 ** retries;
                  await delayAsync(delay);
                  await fetchSubgraphChain(retries + 1);
                }
              }
            } catch (error: any) {
              console.error("Error occured while fetching query", error);
            }
          };

          await fetchSubgraphChain(retryOnNoChange ? 0 : undefined);
        }),
      );

      // Make sure unique values are returned
      setResponse(Array.from(new Set(responseMap.current.values())));
    },
    200,
  );

  return {
    data: response,
    errors: errorsMap,
    refetch: fetchDebounce,
    fetching,
  };
}
