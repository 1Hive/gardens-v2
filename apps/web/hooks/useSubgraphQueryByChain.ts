import { AnyVariables, DocumentInput, OperationContext } from "@urql/next";
import { getContractsAddrByChain } from "@/constants/contracts";
import { useEffect, useState } from "react";
import { ChainId } from "@/types";
import { initUrqlClient } from "@/providers/urql";
import { isEqual, set } from "lodash-es";
import { ChangeEventTopic } from "@/pages/api/websocket.api";
import {
  SubscriptionId,
  useWebSocketContext,
} from "@/contexts/websocket.context";

const INITIAL_DELAY = 1000;
const MAX_RETRIES = 6; // Total waiting time of ~2min

export default function useSubgraphQueryByChain<
  Data = any,
  Variables extends AnyVariables = AnyVariables,
>(
  chain: ChainId,
  query: DocumentInput<any, Variables>,
  variables: Variables = {} as Variables,
  context?: Partial<OperationContext>,
  changeTopics?: ChangeEventTopic[],
) {
  const { urqlClient } = initUrqlClient();
  const { connected, subscribe, unsubscribe } = useWebSocketContext();

  const contractAddress = getContractsAddrByChain(chain);
  const [response, setResponse] = useState<
    Omit<Awaited<ReturnType<typeof fetch>>, "operation">
  >({ hasNext: true, stale: true, data: undefined, error: undefined });

  const [retryCount, setRetryCount] = useState(0); // Track retry count

  if (!contractAddress)
    console.error(`No contract address found for chain ${chain}`);

  useEffect(() => {
    fetch()?.then(setResponse);
  }, []);

  useEffect(() => {
    let subscritionId: SubscriptionId;
    if (connected) {
      subscritionId = subscribe(changeTopics ?? [], (payload) => {
        if (payload.chainId !== chain) return;
        console.debug("Received change event", payload);
        refetch();
      });
    }

    return () => {
      if (subscritionId) {
        unsubscribe(subscritionId);
      }
    };
  }, [connected]);

  const fetch = () =>
    urqlClient
      .query<Data>(query, variables, {
        ...context,
        url: contractAddress?.subgraphUrl,
        requestPolicy: "network-only",
      })
      .then((res) => {
        console.debug("Fetched data", res);
        return res;
      });

  const refetch = () => {
    fetch()?.then((result) => {
      if (
        (!result.error && !isEqual(result.data, response.data)) ||
        retryCount === 0
      ) {
        // Check for changes
        setResponse(result);
        setRetryCount(0); // Reset on successful data change
      } else if (retryCount < MAX_RETRIES) {
        const delay = INITIAL_DELAY * 2 ** retryCount;
        setTimeout(() => refetch(), delay);
        setRetryCount(retryCount + 1);
      } else {
        console.debug("Max retries reached.");
      }
    });
  };

  return { ...response, refetch };
}
