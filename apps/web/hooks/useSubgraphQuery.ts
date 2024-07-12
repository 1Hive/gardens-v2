import { useEffect, useRef, useState } from "react";
import { AnyVariables, DocumentInput, OperationContext } from "@urql/next";
import { isEqual } from "lodash-es";
import { toast } from "react-toastify";
import { useChainIdFromPath } from "./useChainIdFromPath";
import { getConfigByChain } from "@/constants/contracts";
import {
  ChangeEventPayload,
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
}: {
  chainId?: ChainId;
  query: DocumentInput<any, Variables>;
  variables?: Variables;
  context?: Omit<OperationContext, "topic">;
  changeScope?: ChangeEventScope[] | ChangeEventScope;
  enabled?: boolean;
}) {
  const pathChainId = useChainIdFromPath();
  chainId = (chainId ?? pathChainId)!;
  const { urqlClient } = initUrqlClient();
  const { connected, subscribe, unsubscribe } = usePubSubContext();
  const [fetching, setFetching] = useState(true);
  const config = getConfigByChain(chainId);
  const [response, setResponse] = useState<Omit<Awaited<ReturnType<typeof fetch>>, "operation">>({
    hasNext: true,
    stale: true,
    data: undefined,
    error: undefined,
  });

  const latestResponse = useRef(response);
  const subscritionId = useRef<SubscriptionId>();

  useEffect(() => {
    latestResponse.current = response; // Update ref on every response change
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

    subscritionId.current = subscribe(
      changeScope,
      refetchFromOutside.bind({
        response,
        setResponse,
        chain: chainId,
      }),
    );

    return () => {
      if (subscritionId.current) {
        unsubscribe(subscritionId.current);
      }
    };
  }, [connected]);

  const fetch = () =>
    urqlClient.query<Data>(query, variables, {
      ...context,
      url: config?.subgraphUrl,
      requestPolicy: "network-only",
    });

  const isDataAlreadyFetched = (
    newFetchedData: Data,
    payload?: ChangeEventPayload,
  ) => {
    if (!payload) {
      return false;
    }
    if (payload.type === "add") {
      const dataJsonString = JSON.stringify(newFetchedData).toLowerCase();
      if (
        payload.id &&
        dataJsonString.includes(payload.id.toString().toLowerCase())
      ) {
        return true;
      }
    }
    return false;
  };

  const refetchFromOutside = async (payload?: ChangeEventPayload) => {
    if (fetching) {
      return;
    }
    setFetching(true);
    const res = await refetch(payload);
    setResponse(res);
    setFetching(false);
  };

  const refetch = async (
    changePayload?: ChangeEventPayload,
    retryCount?: number,
  ): Promise<Awaited<ReturnType<typeof fetch>>> => {
    const result = await fetch();
    if (!retryCount) {
      retryCount = 0;
      toast.loading("Pulling new data", {
        toastId: pendingRefreshToastId,
        autoClose: false,
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
      (!isEqual(result.data, latestResponse.current.data) ||
        isDataAlreadyFetched(result.data, changePayload) ||
        retryCount >= CHANGE_EVENT_MAX_RETRIES)
    ) {
      if (retryCount >= CHANGE_EVENT_MAX_RETRIES) {
        console.debug(
          `⚡ Still not updated but max retries reached. (retry count: ${retryCount})`,
        );
      } else {
        console.debug(
          `⚡ Subgraph result updated after ${retryCount} retries.`,
        );
      }
      setFetching(false);
      try {
        toast.dismiss(pendingRefreshToastId);
      } catch (error) {
        console.error("Error dismissing toast", error);
      }
      return result;
    } else {
      console.debug(
        `⚡ Subgraph result not yet updated, retrying with incremental delays... (retry count: ${retryCount + 1}/${CHANGE_EVENT_MAX_RETRIES})`,
      );
      const delay = CHANGE_EVENT_INITIAL_DELAY * 2 ** retryCount;
      await delayAsync(delay);
      return refetch(changePayload, retryCount + 1);
    }
  };

  useEffect(() => {
    if (!enabled) {
      return;
    }
    const init = async () => {
      setFetching(true);
      const resp = await fetch();
      setResponse(resp);
      setFetching(false);
    };
    init();
  }, [enabled]);

  return {
    ...response,
    refetch: refetchFromOutside,
    fetching,
  };
}
