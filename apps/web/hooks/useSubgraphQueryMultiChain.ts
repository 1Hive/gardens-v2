import { useEffect, useRef, useState } from "react";
import {
  AnyVariables,
  CombinedError,
  DocumentInput,
  OperationContext,
} from "@urql/next";
import { debounce, isEqual } from "lodash-es";
import { toast } from "react-toastify";
import { useIsMounted } from "./useIsMounted";
import { HTTP_CODES } from "@/app/api/utils";
import { chains, getConfigByChain } from "@/configs/chains";
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

const allChains: ChainId[] = Object.values(chains)
  .filter((x) => (isProd ? !x.testnet : !!x.testnet)) // if prod, only prod chains
  .map((x) => x.id);

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
}: {
  query: DocumentInput<any, Variables>;
  variables?: Variables;
  queryContext?: Partial<OperationContext>;
  changeScope?: ChangeEventScope[] | ChangeEventScope;
  chainIds?: ChainId[];
}) {
  const { connected, subscribe, unsubscribe } = usePubSubContext();
  const mounted = useIsMounted();
  const [response, setResponse] = useState<Data[]>();
  const [fetching, setFetching] = useState(false);

  const responseMap = useRef(new Map<ChainId, Data>());
  const errorsMap = useRef(new Map<ChainId, CombinedError>());
  const subscritionId = useRef<SubscriptionId>();
  const fetchingRef = useRef(false);

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
          url: getConfigByChain(chain)?.subgraphUrl,
        }),
      );
      await Promise.all(
        chainSubgraphs.map(async ({ chainId, url }, i) => {
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
              const fetchQuery = async () => {
                const { urqlClient } = initUrqlClient({
                  chainId: (chainsOverride ?? allChains)[i],
                });
                return urqlClient.query<Data>(query, variables, {
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
                  setFetching(false);
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
      setResponse(Array.from(new Set(responseMap.current.values())));
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
