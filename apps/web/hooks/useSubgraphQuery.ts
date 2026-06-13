import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnyVariables, DocumentInput, OperationContext } from "@urql/next";
import { isEqual } from "lodash-es";
import { toast } from "react-toastify";
import { useChainIdFromPath } from "./useChainIdFromPath";
import { useFlag } from "./useFlag";
import { useIsMounted } from "./useIsMounted";
import { LoadingToast } from "@/components";
import { getConfigByChain } from "@/configs/chains";
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

export const PENDING_SUBGRAPH_REFRESH_TOAST_ID = "pending-refresh";

type RefetchOptions = {
  showToast?: boolean;
};

/**
 * Module-level cache that persists query data across component remounts.
 * This prevents the loading spinner from re-appearing when the component
 * tree is remounted (e.g. during a WalletConnect reset flow after wallet change).
 */
const queryDataCache = new Map<string, unknown>();
const MAX_QUERY_CACHE_SIZE = 50;

function getOperationName(query: DocumentInput<any, any>): string {
  if (typeof query === "string") {
    const match = query.match(/^\s*(?:query|mutation|subscription)\s+(\w+)/);
    return match?.[1] ?? "unknown";
  }
  const def = (query as any)?.definitions?.find(
    (d: any) => d.kind === "OperationDefinition",
  );
  return (def?.name?.value as string | undefined) ?? "unknown";
}

export function dismissPendingSubgraphRefreshToast() {
  try {
    if (toast.isActive(PENDING_SUBGRAPH_REFRESH_TOAST_ID)) {
      toast.dismiss(PENDING_SUBGRAPH_REFRESH_TOAST_ID);
    }
  } catch (error) {
    // ignore dismiss error
  }
}

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
}): {
  hasNext: boolean;
  stale: boolean;
  data: Data | undefined;
  error: any | undefined;
  refetch: (
    options?: RefetchOptions,
  ) => Promise<Awaited<ReturnType<typeof fetch>>>;
  fetching: boolean;
} {
  const mounted = useIsMounted();
  const pathChainId = useChainIdFromPath();
  const resolvedChainId = chainId ?? pathChainId;
  const { urqlClient } = initUrqlClient();
  const { connected, subscribe, unsubscribe } = usePubSubContext();
  const [fetching, setFetching] = useState(false);
  const config =
    resolvedChainId != null ? getConfigByChain(resolvedChainId) : undefined;

  // Build a stable cache key for this query so data can be reused after remounts
  const operationName = getOperationName(query);
  const cacheKey = JSON.stringify({
    chainId: resolvedChainId,
    operationName,
    variables,
  });

  const [response, setResponse] = useState<
    Omit<Awaited<ReturnType<typeof fetch>>, "operation">
  >(() => {
    // Seed initial state from the module-level cache (survives component remounts
    // such as the WalletConnect reset flow) so the page isn't replaced by a spinner.
    const cachedData = enabled
      ? (queryDataCache.get(cacheKey) as Data | undefined)
      : undefined;
    return {
      // Cached data is always stale; the hook will re-fetch it in the background.
      hasNext: cachedData == null,
      stale: true,
      data: cachedData,
      error: undefined,
    };
  });

  const latestResponse = useRef({ variables, response });
  const subscritionId = useRef<SubscriptionId>();
  const stableChangeScopeRef = useRef<ChangeEventScope[] | undefined>();
  const fetchingRef = useRef(false);
  const fetchPromiseRef = useRef<Promise<Awaited<ReturnType<typeof fetch>>> | null>(
    null,
  );
  const skipPublished = useFlag("skipPublished");

  // Keep a ref pointing to the current cache key so the effect below can always
  // write to the right key without needing `variables` in its dependency array
  // (the `variables` object is recreated on every render).
  const cacheKeyRef = useRef(cacheKey);
  cacheKeyRef.current = cacheKey;

  useEffect(() => {
    latestResponse.current.response = response; // Update ref on every response change
  }, [response]);

  // Persist the latest successful response in the module-level cache so it can
  // be used as initial state if the component remounts (e.g. after a wallet
  // change that triggers a WalletConnect reset and a full provider tree remount).
  useEffect(() => {
    if (response.data != null) {
      // Evict the oldest entry when the cache reaches its size limit
      if (queryDataCache.size >= MAX_QUERY_CACHE_SIZE) {
        const oldestKey = queryDataCache.keys().next().value;
        if (oldestKey !== undefined) {
          queryDataCache.delete(oldestKey);
        }
      }
      queryDataCache.set(cacheKeyRef.current, response.data);
    }
  }, [response.data]);

  if (enabled && resolvedChainId != null && !config) {
    console.error(`No subgraph address found for chain ${resolvedChainId}`);
  }

  const normalizedChangeScope = useMemo(() => {
    if (
      !changeScope ||
      (Array.isArray(changeScope) && changeScope.length === 0)
    )
      return undefined;
    const scopes = Array.isArray(changeScope) ? changeScope : [changeScope];
    return scopes.map((scope) => ({
      ...scope,
      chainId: scope.chainId ?? resolvedChainId,
    }));
  }, [changeScope, resolvedChainId]);

  if (!isEqual(stableChangeScopeRef.current, normalizedChangeScope)) {
    stableChangeScopeRef.current = normalizedChangeScope;
  }

  const stableNormalizedChangeScope = stableChangeScopeRef.current;

  useEffect(() => {
    if (!stableNormalizedChangeScope || stableNormalizedChangeScope.length === 0) {
      return;
    }
    if (!connected) {
      return;
    }

    const subscriptionId = subscribe(stableNormalizedChangeScope, () => {
      return refetchFromOutside.call({
        response,
        fetching,
        setResponse,
        chain: resolvedChainId,
        mounted,
      });
    });
    subscritionId.current = subscriptionId;

    return () => {
      if (subscriptionId) {
        unsubscribe(subscriptionId);
      }
      dismissPendingSubgraphRefreshToast();
    };
  }, [connected, stableNormalizedChangeScope]);

  const fetch = async () => {
    if (!config) {
      return {
        hasNext: false,
        stale: false,
        data: undefined,
        error: undefined,
      };
    }

    const withLowercaseAddresses: AnyVariables = {};
    Object.entries({ ...variables }).forEach(([key, value]) => {
      withLowercaseAddresses[key] =
        typeof value === "string" && value.startsWith("0x") ?
          value?.toLowerCase()
        : value;
    });

    const urqlQuery = (useDev: boolean) =>
      urqlClient.query<Data>(query, variables, {
        ...context,
        url:
          useDev || !config.publishedSubgraphUrl ?
            config.subgraphUrl
          : config.publishedSubgraphUrl,
        requestPolicy: "network-only",
      });

    let res;
    try {
      res = await urqlQuery(skipPublished);
      if (!res.data && res.error) {
        throw res.error;
      }
    } catch (err1) {
      console.error(
        "⚡ Error fetching through published subgraph, retrying with hosted:",
        err1,
      );
      res = await urqlQuery(true);
    }

    return modifier && res?.data ? { ...res, data: modifier(res.data) } : res;
  };

  const refetchFromOutside = async (
    options?: RefetchOptions,
  ): Promise<Awaited<ReturnType<typeof fetch>>> => {
    if (!enabled) {
      console.debug(
        "⚡ Query not enabled when refetching from outside, skipping",
      );
      return latestResponse.current.response as Awaited<ReturnType<typeof fetch>>;
    }
    if (fetchingRef.current) {
      console.debug(
        "⚡ Already fetching, waiting for current fetch before retrying",
      );
      try {
        await fetchPromiseRef.current;
      } catch (error) {
        console.debug("⚡ Current fetch failed before external refetch", error);
      }
      if (fetchingRef.current) {
        return latestResponse.current
          .response as Awaited<ReturnType<typeof fetch>>;
      }
    }
    setFetching(true);
    fetchingRef.current = true;
    const res = await refetch(undefined, options);
    setResponse(res);
    setFetching(false);
    fetchingRef.current = false;
    return res;
  };

  const refetch = async (
    retryCount?: number,
    options?: RefetchOptions,
  ): Promise<Awaited<ReturnType<typeof fetch>>> => {
    if (retryCount == null) {
      retryCount = 0;
    }

    const showToast = options?.showToast ?? true;
    if (showToast) {
      const toastContent = React.createElement(LoadingToast, {
        message: "Pulling new data",
      });

      if (toast.isActive(PENDING_SUBGRAPH_REFRESH_TOAST_ID)) {
        toast.update(PENDING_SUBGRAPH_REFRESH_TOAST_ID, {
          render: toastContent,
        });
      } else {
        toast.loading(toastContent, {
          toastId: PENDING_SUBGRAPH_REFRESH_TOAST_ID,
          autoClose: false,
          closeOnClick: true,
          closeButton: false,
          icon: false,
          style: {
            width: "fit-content",
            marginLeft: "auto",
          },
        });
      }
    }

    const resultPromise = fetch();
    fetchPromiseRef.current = resultPromise;
    const result = await resultPromise.finally(() => {
      if (fetchPromiseRef.current === resultPromise) {
        fetchPromiseRef.current = null;
      }
    });

    if (retryCount >= CHANGE_EVENT_MAX_RETRIES || !mounted.current) {
      if (retryCount >= CHANGE_EVENT_MAX_RETRIES) {
        console.debug(
          `⚡ Stopping retries after reaching max retries. (retry count: ${retryCount})`,
        );
      } else {
        console.debug("⚡ Component unmounted, cancelling");
      }
      setFetching(false);
      fetchingRef.current = false;
      dismissPendingSubgraphRefreshToast();
      return result;
    }

    if (result.error) {
      console.error("⚡ Error fetching subgraph data:", result.error);
      return result;
    }
    if (
      result.data &&
      !isEqual(result.data, latestResponse.current.response.data)
    ) {
      console.debug(
        `⚡ Subgraph result updated after ${retryCount} retries.`,
      );
      setFetching(false);
      fetchingRef.current = false;
      dismissPendingSubgraphRefreshToast();
      return result;
    } else {
      console.debug(
        `⚡ Subgraph result not yet updated, retrying in ${(CHANGE_EVENT_INITIAL_DELAY * 2 ** retryCount) / 1000}s... (retry count: ${retryCount + 1}/${CHANGE_EVENT_MAX_RETRIES})`,
        {
          latestResult: latestResponse.current.response.data,
          result: result.data,
        },
      );
      const delay = CHANGE_EVENT_INITIAL_DELAY * 2 ** retryCount;
      await delayAsync(delay);
      return refetch(retryCount + 1, options);
    }
  };

  useEffect(() => {
    if (
      !enabled ||
      !config ||
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
        const resultPromise = fetch();
        fetchPromiseRef.current = resultPromise;
        resp = await resultPromise.finally(() => {
          if (fetchPromiseRef.current === resultPromise) {
            fetchPromiseRef.current = null;
          }
        });
      }
      setResponse(resp);
      setFetching(false);
      fetchingRef.current = false;
    })();
  }, [enabled, variables]);

  return {
    hasNext: response.hasNext,
    stale: response.stale,
    data: response.data,
    error: response.error,
    refetch: (options) => {
      return refetchFromOutside(options);
    },
    fetching,
  };
}
