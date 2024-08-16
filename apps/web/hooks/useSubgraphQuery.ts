import { useEffect, useRef, useState } from "react";
import { AnyVariables, DocumentInput, OperationContext } from "@urql/next";
import { isEqual } from "lodash-es";
import { toast } from "react-toastify";
import { useChainIdFromPath } from "./useChainIdFromPath";
import { useIsMounted } from "./useIsMounted";
import { getConfigByChain } from "@/constants/contracts";
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

const pendingRefreshToastId = "pending-refresh";

/**
 *  Fetches data from a subgraph by chain id
 * @param chainId
 * @param query
 * @param variables
 * @param context
 * @param changeScope  - optional, if provided, will subscribe to change events (see jsdoc in pubsub.context.tsx)
 * @returns
 */
export function useSubgraphQuery<
  Data = any,
  Variables extends AnyVariables = AnyVariables,
>({
  chainId,
  query,
  variables = {} as Variables,
  context,
  changeScope: changeScope,
  enabled = true,
  modifier,
}: {
  chainId?: ChainId;
  query: DocumentInput<any, Variables>;
  variables?: Variables;
  context?: Omit<OperationContext, "topic">;
  changeScope?: ChangeEventScope[] | ChangeEventScope;
  enabled?: boolean;
  modifier?: (data: Data) => Data;
}) {
  const mounted = useIsMounted();
  const pathChainId = useChainIdFromPath();
  chainId = (chainId ?? pathChainId)!;
  const { urqlClient } = initUrqlClient();
  const { connected, subscribe, unsubscribe } = usePubSubContext();
  const [fetching, setFetching] = useState(false);
  const config = getConfigByChain(chainId);
  const [response, setResponse] = useState<
    Omit<Awaited<ReturnType<typeof fetch>>, "operation">
  >({
    hasNext: true,
    stale: true,
    data: undefined,
    error: undefined,
  });

  const latestResponse = useRef({ variables, response });
  const subscritionId = useRef<SubscriptionId>();
  const fetchingRef = useRef(false);

  useEffect(() => {
    latestResponse.current.response = response; // Update ref on every response change
  }, [response]);

  if (!config) {
    console.error(`No subgraph address found for chain ${chainId}`);
  }

  useEffect(() => {
    if (!connected || !changeScope || !changeScope.length) {
      return;
    }

    changeScope = Array.isArray(changeScope) ? changeScope : [changeScope];
    changeScope.forEach((scope) => {
      if (!scope.chainId) {
        scope.chainId = chainId;
      }
    });

    subscritionId.current = subscribe(changeScope, () => {
      return refetchFromOutside.call({
        response,
        fetching,
        setResponse,
        chain: chainId,
        mounted,
      });
    });

    return () => {
      if (subscritionId.current) {
        unsubscribe(subscritionId.current);
      }
      try {
        if (toast.isActive(pendingRefreshToastId)) {
          toast.dismiss(pendingRefreshToastId);
        }
      } catch (error) {
        // ignore when toast is already dismissed
      }
    };
  }, [connected]);

  const fetch = async () => {
    const res = await urqlClient.query<Data>(query, variables, {
      ...context,
      url: config?.subgraphUrl,
      requestPolicy: "network-only",
    });
    return modifier && res.data ? { ...res, data: modifier(res.data) } : res;
  };

  const refetchFromOutside = async () => {
    if (!enabled) {
      console.debug(
        "⚡ Query not enabled when refetching from outside, skipping",
      );
      return;
    }
    if (fetchingRef.current) {
      console.debug("⚡ Already fetching, skipping refetch");
      return;
    }
    setFetching(true);
    fetchingRef.current = true;
    const res = await refetch();
    setResponse(res);
    setFetching(false);
    fetchingRef.current = false;
    return res;
  };

  const refetch = async (
    retryCount?: number,
  ): Promise<Awaited<ReturnType<typeof fetch>>> => {
    const result = await fetch();
    if (!retryCount) {
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

    if (result.error) {
      console.error("⚡ Error fetching subgraph data:", result.error);
      return result;
    }
    if (
      result.data &&
      (!isEqual(result.data, latestResponse.current.response.data) ||
        retryCount >= CHANGE_EVENT_MAX_RETRIES ||
        !mounted.current)
    ) {
      if (retryCount >= CHANGE_EVENT_MAX_RETRIES) {
        console.debug(
          `⚡ Still not updated but max retries reached. (retry count: ${retryCount})`,
        );
      } else if (!mounted.current) {
        console.debug("⚡ Component unmounted, cancelling");
      } else {
        console.debug(
          `⚡ Subgraph result updated after ${retryCount} retries.`,
        );
      }
      setFetching(false);
      fetchingRef.current = false;
      try {
        if (toast.isActive(pendingRefreshToastId)) {
          toast.dismiss(pendingRefreshToastId);
        }
      } catch (error) {
        // ignore dismiss error
      }
      return result;
    } else {
      console.debug(
        `⚡ Subgraph result not yet updated, retrying with incremental delays... (retry count: ${retryCount + 1}/${CHANGE_EVENT_MAX_RETRIES})`,
        {
          latestResult: latestResponse.current.response.data,
          result: result.data,
        },
      );
      const delay = CHANGE_EVENT_INITIAL_DELAY * 2 ** retryCount;
      await delayAsync(delay);
      return refetch(retryCount + 1);
    }
  };

  useEffect(() => {
    if (
      !enabled ||
      fetching ||
      (!!latestResponse.current.response.data &&
        isEqual(variables, latestResponse.current.variables)) || // Skip if variables are the same
      !!latestResponse.current.response.error
    ) {
      return;
    }

    latestResponse.current.variables = variables; // Update ref on every variable change

    (async () => {
      setFetching(true);
      fetchingRef.current = true;
      let resp;
      // If we are already fetching, we should refetch with the toast
      if (
        !!latestResponse.current.response.data ||
        !!latestResponse.current.response.error
      ) {
        resp = await refetch();
      } else {
        resp = await fetch();
      }
      setResponse(resp);
      setFetching(false);
      fetchingRef.current = false;
    })();
  }, [enabled, variables]);

  return {
    ...response,
    refetch: () => {
      return refetchFromOutside();
    },
    fetching,
  };
}
