import { useEffect, useRef, useState } from "react";
import {
  AnyVariables,
  CombinedError,
  DocumentInput,
  OperationContext,
} from "@urql/next";
import { debounce, isEqual } from "lodash-es";
import { arbitrumSepolia, localhost, sepolia } from "viem/chains";
import { HTTP_CODES } from "@/app/api/utils";
import { getContractsAddrByChain } from "@/constants/contracts";
import {
  ChangeEventScope,
  SubscriptionId,
  usePubSubContext,
} from "@/contexts/pubsub.context";
import {
  CHANGE_EVENT_INITIAL_DELAY,
  CHANGE_EVENT_MAX_RETRIES,
} from "@/globals";
import { initUrqlClient } from "@/providers/urql";
import { ChainId } from "@/types";
import delayAsync from "@/utils/delayAsync";

const allChains: ChainId[] = [
  sepolia.id,
  arbitrumSepolia.id,
  // optimismSepolia.id,
];
if (process.env.NODE_ENV === "development") {
  allChains.push(localhost.id);
}

export default function useSubgraphQueryMultiChain<
  Data = any,
  Variables extends AnyVariables = AnyVariables,
>({
  query,
  variables = {} as Variables,
  queryContext,
  changeScope,
  chainIds,
}: {
  query: DocumentInput<any, Variables>;
  variables?: Variables;
  queryContext?: Partial<OperationContext>;
  changeScope?: ChangeEventScope[] | ChangeEventScope;
  chainIds?: ChainId[];
}) {
  const { connected, subscribe, unsubscribe } = usePubSubContext();

  const [response, setResponse] = useState<Data[]>();
  const [fetching, setFetching] = useState(true);

  const responseMap = useRef(new Map<ChainId, Data>());
  const errorsMap = useRef(new Map<ChainId, CombinedError>());
  const subscritionId = useRef<SubscriptionId>();

  useEffect(() => {
    const init = async () => {
      setFetching(true);
      await fetchDebounce();
    };
    init();
  }, []);

  useEffect(() => {
    if (!connected || !changeScope || changeScope.length === 0) {
      return;
    }

    subscritionId.current = subscribe(changeScope, (payload) => {
      fetchDebounce(payload.chainId ? [payload.chainId] : undefined, true);
    });

    return () => {
      if (subscritionId.current) {
        unsubscribe(subscritionId.current);
      }
    };
  }, [connected]);

  const fetchDebounce = debounce(
    async (chainsOverride?: ChainId[], retryOnNoChange?: boolean) => {
      const chainSubgraphs = (chainsOverride ?? chainIds ?? allChains).map(
        (chain) => ({
          chainId: chain,
          url: getContractsAddrByChain(chain)?.subgraphUrl,
        }),
      );
      await Promise.all(
        chainSubgraphs.map(async ({ chainId, url }, i) => {
          const fetchSubgraphChain = async (retryCount?: number) => {
            try {
              const fetchQuery = async () => {
                const { urqlClient } = initUrqlClient({
                  chainId: (chainsOverride ?? allChains)[i],
                });
                return await urqlClient.query<Data>(query, variables, {
                  ...queryContext,
                  url,
                  chainId,
                  requestPolicy: "network-only",
                } as OperationContext & { _instance: any });
              };

              const res = await fetchQuery();

              if (res.error) {
                errorsMap.current.set(chainId, res.error);
              } else {
                if (
                  !isEqual(res.data, responseMap.current.get(chainId)) ||
                  retryCount === undefined ||
                  retryCount >= CHANGE_EVENT_MAX_RETRIES
                ) {
                  if (retryCount === CHANGE_EVENT_MAX_RETRIES) {
                    console.debug(
                      `Still not updated but max retries reached. (retry count: ${retryCount})`,
                    );
                  }
                  responseMap.current.set(chainId, res.data!);
                } else {
                  console.debug(
                    `Subgraph-${chainId} result not yet updated, retrying with incremental delays... (retry count: ${retryCount + 1}/${CHANGE_EVENT_MAX_RETRIES})`,
                  );
                  const delay = CHANGE_EVENT_INITIAL_DELAY * 2 ** retryCount;
                  await delayAsync(delay);
                  await fetchSubgraphChain(retryCount + 1);
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
      setFetching(false);
    },
    HTTP_CODES.SUCCESS,
  );

  return {
    data: response,
    errors: errorsMap.current,
    refetch: fetchDebounce,
    fetching,
  };
}
