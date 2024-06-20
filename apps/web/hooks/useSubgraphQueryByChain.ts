import { AnyVariables, DocumentInput, OperationContext } from "@urql/next";
import { getContractsAddrByChain } from "@/constants/contracts";
import { useEffect, useState } from "react";
import { ChainId } from "@/types";
import { initUrqlClient } from "@/providers/urql";
import { isEqual, max, set } from "lodash-es";
import { ChangeEventTopic } from "@/pages/api/websocket.api";
import {
  SubscriptionId,
  useWebSocketContext,
} from "@/contexts/websocket.context";
import delayAsync from "@/utils/delayAsync";

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

  if (!contractAddress)
    console.error(`No contract address found for chain ${chain}`);

  useEffect(() => {
    let subscritionId: SubscriptionId;
    if (connected) {
      subscritionId = subscribe(changeTopics ?? [], (payload) => {
        if (payload.chainId?.toString() !== chain.toString()) return;
        console.debug("Received change event", payload);
        refetch().then(setResponse);
      });
    }

    return () => {
      if (subscritionId) {
        unsubscribe(subscritionId);
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
    oldResponse?: typeof response,
  ): Promise<Omit<Awaited<ReturnType<typeof fetch>>, "operation">> => {
    const result = await fetch();
    if (!retryCount) {
      retryCount = 0;
    }
    if (!oldResponse) {
      oldResponse = response;
    }
    console.log({
      retryCount,
      resultData: result.data,
      responseData: oldResponse.data,
      equal: JSON.stringify(result.data) === JSON.stringify(oldResponse.data),
    });
    if (
      (!result.error && !isEqual(result.data, oldResponse.data)) ||
      retryCount >= MAX_RETRIES - 1
    ) {
      if (retryCount === MAX_RETRIES - 1) {
        console.debug(`Max retries reached. (retry count: ${retryCount})`);
      }
      return result;
    } else {
      console.debug(
        `Subgraph result not yet updated, retrying with incremental delays... (retry count: ${retryCount + 1}/${MAX_RETRIES})`,
      );
      const delay = INITIAL_DELAY * 2 ** retryCount;
      await delayAsync(delay);
      return refetch(retryCount + 1, oldResponse);
    }
  };

  useEffect(() => {
    fetch().then((resp) => setResponse(resp));
  }, []);

  return { ...response, refetch };
}
