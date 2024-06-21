import { AnyVariables, DocumentInput, OperationContext } from "@urql/next";
import { getContractsAddrByChain } from "@/constants/contracts";
import { useEffect, useRef, useState } from "react";
import { ChainId } from "@/types";
import { initUrqlClient } from "@/providers/urql";
import { isEqual } from "lodash-es";
import {
  ChangeEventScope,
  SubscriptionId,
  usePubSubContext,
} from "@/contexts/pubsub.context";
import delayAsync from "@/utils/delayAsync";
import {
  CHANGE_EVENT_INITIAL_DELAY,
  CHANGE_EVENT_MAX_RETRIES,
} from "@/globals";

/**
 *  Fetches data from a subgraph by chain id
 * @param chainId
 * @param query
 * @param variables
 * @param context
 * @param changeScope  - optional, if provided, will subscribe to change events (see jsdoc in pubsub.context.tsx)
 * @returns
 */
export default function useSubgraphQueryByChain<
  Data = any,
  Variables extends AnyVariables = AnyVariables,
>(
  chainId: ChainId,
  query: DocumentInput<any, Variables>,
  variables: Variables = {} as Variables,
  context?: Omit<OperationContext, "topic">,
  changeScope?: ChangeEventScope[] | ChangeEventScope,
) {
  const { urqlClient } = initUrqlClient();
  const { connected, subscribe, unsubscribe } = usePubSubContext();
  const [fetching, setFetching] = useState(true);
  const contractAddress = getContractsAddrByChain(chainId);
  const [response, setResponse] = useState<
    Omit<Awaited<ReturnType<typeof fetch>>, "operation">
  >({ hasNext: true, stale: true, data: undefined, error: undefined });

  const latestResponse = useRef(response);
  const subscritionId = useRef<SubscriptionId>();

  useEffect(() => {
    latestResponse.current = response; // Update ref on every response change
  }, [response]);

  if (!contractAddress) {
    console.error(`No contract address found for chain ${chainId}`);
  }

  useEffect(() => {
    if (!connected || !changeScope || !changeScope.length) {
      return;
    }

    const onChangeEvent = () => {
      refetch().then((res) => setResponse(res));
    };

    subscritionId.current = subscribe(
      changeScope,
      onChangeEvent.bind({
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
      url: contractAddress?.subgraphUrl,
      requestPolicy: "network-only",
    });

  const refetch = async (
    retryCount?: number,
  ): // @ts-ignore
  ReturnType<typeof fetch> => {
    const result = await fetch();
    if (!retryCount) {
      retryCount = 0;
    }
    if (
      (!result.error && !isEqual(result.data, latestResponse.current.data)) ||
      retryCount >= CHANGE_EVENT_MAX_RETRIES
    ) {
      if (retryCount >= CHANGE_EVENT_MAX_RETRIES) {
        console.debug(
          `Still not updated but max retries reached. (retry count: ${retryCount})`,
        );
      } else {
        console.debug(`Subgraph result updated after ${retryCount} retries.`);
      }
      return result;
    } else {
      console.debug(
        `Subgraph result not yet updated, retrying with incremental delays... (retry count: ${retryCount + 1}/${CHANGE_EVENT_MAX_RETRIES})`,
      );
      const delay = CHANGE_EVENT_INITIAL_DELAY * 2 ** retryCount;
      await delayAsync(delay);
      return refetch(retryCount + 1);
    }
  };

  useEffect(() => {
    const init = async () => {
      setFetching(true);
      const resp = await fetch();
      setResponse(resp);
      setFetching(false);
    };
    init();
  }, []);

  return { ...response, refetch, fetching };
}
