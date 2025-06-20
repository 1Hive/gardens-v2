import { useEffect, useRef, useState } from "react";
import {
  AnyVariables,
  CombinedError,
  DocumentInput,
  OperationContext,
} from "@urql/next";
import { debounce, isEqual } from "lodash-es";
import { toast } from "react-toastify";
import { getCheat, useCheat } from "./useCheat";
import { useIsMounted } from "./useIsMounted";
import { HTTP_CODES } from "@/app/api/utils";
import { chainConfigMap, getConfigByChain } from "@/configs/chains";
import { isProd } from "@/configs/isProd";
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
import { delayAsync } from "@/utils/delayAsync";

let isQueryAllChains = false;
try {
  isQueryAllChains = getCheat("queryAllChains");
} catch (error) {
  // ignore when not browser side
}

export const allChains: ChainId[] = Object.entries(chainConfigMap)
  .filter(
    ([_, chainConfig]) =>
      isQueryAllChains ||
      (isProd ? !chainConfig.isTestnet : !!chainConfig.isTestnet),
  )
  .map(([chainId]) => Number(chainId));

const pendingRefreshToastId = "pending-refresh";

export function useSubgraphQueryMultiChain<
  Data = any,
  Variables extends AnyVariables = AnyVariables,
>({
  query,
  variables = {} as Variables,
  queryContext,
  changeScope,
  chainIds,
  modifier,
}: {
  query: DocumentInput<any, Variables>;
  variables?: Variables;
  queryContext?: Partial<OperationContext>;
  changeScope?: ChangeEventScope[] | ChangeEventScope;
  chainIds?: ChainId[];
  modifier?: (data: Data[]) => any[] | Promise<any[]>;
}) {
  const { connected, subscribe, unsubscribe } = usePubSubContext();
  const mounted = useIsMounted();
  const [response, setResponse] = useState<Data[]>();
  const [fetching, setFetching] = useState(false);

  const responseMap = useRef(new Map<ChainId, Data>());
  const errorsMap = useRef(new Map<ChainId, CombinedError>());
  const subscritionId = useRef<SubscriptionId>();
  const fetchingRef = useRef(false);
  const skipPublished = useCheat("skipPublished");

  useEffect(() => {
    const init = async () => {
      setFetching(true);
      fetchingRef.current = true;
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
      try {
        toast.dismiss(pendingRefreshToastId);
      } catch (error) {
        // ignore when toast is already dismissed
      }
    };
  }, [connected]);

  const fetchDebounce = debounce(
    async (chainsOverride?: ChainId[], retryOnNoChange?: boolean) => {
      const chainSubgraphs = (chainsOverride ?? chainIds ?? allChains).map(
        (chain) => ({
          chainId: +chain,
          chainConfig: getConfigByChain(chain),
        }),
      );
      await Promise.all(
        chainSubgraphs.map(async ({ chainId, chainConfig }, i) => {
          const fetchSubgraphChain = async (retryCount?: number) => {
            if (!retryCount && retryOnNoChange) {
              retryCount = 0;
              toast.loading("Pulling new data", {
                toastId: pendingRefreshToastId,
                autoClose: false,
                closeOnClick: true,
                style: {
                  width: "fit-content",
                  marginLeft: "auto",
                },
              });
            }
            try {
              const fetchQuery = async (useDev: boolean) => {
                const { urqlClient } = initUrqlClient({
                  chainId: (chainsOverride ?? allChains)[i],
                });
                if (!urqlClient) {
                  throw new Error(
                    `Urql client not initialized for chain ${chainId}`,
                  );
                }
                return urqlClient.query<Data>(query, variables, {
                  ...queryContext,
                  url:
                    useDev || !chainConfig?.publishedSubgraphUrl ?
                      chainConfig?.subgraphUrl
                    : chainConfig?.publishedSubgraphUrl,
                  chainId,
                  requestPolicy: "network-only",
                } as OperationContext & { _instance: any });
              };

              let res;
              try {
                const shouldSkipPublished =
                  skipPublished ||
                  process.env.NEXT_PUBLIC_SKIP_PUBLISHED === "true";
                res = await fetchQuery(shouldSkipPublished);
              } catch (err1) {
                console.error(
                  "⚡ Error fetching through published subgraph, retrying with hosted:",
                  err1,
                );
                res = await fetchQuery(true);
              }

              if (res.error) {
                errorsMap.current.set(chainId, res.error);
              } else {
                if (
                  !isEqual(res.data, responseMap.current.get(chainId)) ||
                  retryCount === undefined ||
                  retryCount >= CHANGE_EVENT_MAX_RETRIES ||
                  !mounted.current
                ) {
                  if (retryCount === CHANGE_EVENT_MAX_RETRIES) {
                    console.debug(
                      `⚡ Still not updated but max retries reached. (retry count: ${retryCount})`,
                    );
                  } else if (!mounted.current) {
                    console.debug("⚡ Component unmounted, skipping update");
                  } else {
                    console.debug(
                      `⚡ Subgraph-${chainId} result updated, retry count: ${retryCount}`,
                    );
                  }
                  responseMap.current.set(chainId, res.data!);
                  fetchingRef.current = false;
                  try {
                    toast.dismiss(pendingRefreshToastId);
                  } catch (error) {
                    // ignore when toast is already dismissed
                  }
                } else {
                  console.debug(
                    `⚡ Subgraph-${chainId} result not yet updated, retrying with incremental delays... (retry count: ${retryCount + 1}/${CHANGE_EVENT_MAX_RETRIES})`,
                  );
                  const delay = CHANGE_EVENT_INITIAL_DELAY * 2 ** retryCount;
                  await delayAsync(delay);
                  await fetchSubgraphChain(retryCount + 1);
                }
              }
            } catch (error: any) {
              console.error("⚡ Error occured while fetching query", error);
            }
          };

          await fetchSubgraphChain(retryOnNoChange ? 0 : undefined);
        }),
      );
      // Make sure unique values are returned
      const result = Array.from(new Set(responseMap.current.values()));
      setResponse(modifier ? await modifier(result) : result);
      setFetching(false);
      fetchingRef.current = false;
    },
    HTTP_CODES.SUCCESS,
  );
  return {
    data: response,
    errors: errorsMap.current,
    refetch: () => {
      if (fetchingRef.current) {
        console.debug("⚡ Already fetching, skipping...");
      }
      return fetchDebounce();
    },
    fetching,
  };
}
