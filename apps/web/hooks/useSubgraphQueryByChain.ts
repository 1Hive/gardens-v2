import { AnyVariables, DocumentInput, OperationContext } from "@urql/next";
import { getContractsAddrByChain } from "@/constants/contracts";
import { useEffect, useRef, useState } from "react";
import { ChainId } from "@/types";
import { initUrqlClient } from "@/providers/urql";
import { isEqual, max, set } from "lodash-es";
import {
  SubscriptionId,
  useWebSocketContext,
} from "@/contexts/websocket.context";
import delayAsync from "@/utils/delayAsync";
import { ChangeEventScope } from "@/pages/api/websocket.api";
import { useDebouncedCallback } from "use-debounce";

const INITIAL_DELAY = 2000;
const MAX_RETRIES = 6; // Total waiting time of ~2min

export default function useSubgraphQueryByChain<
  Data = any,
  Variables extends AnyVariables = AnyVariables,
>(
  chainId: ChainId,
  query: DocumentInput<any, Variables>,
  variables: Variables = {} as Variables,
  context?: Partial<OperationContext>,
  changeScope?: ChangeEventScope[],
) {
  const { urqlClient } = initUrqlClient();
  const { connected, subscribe, unsubscribe } = useWebSocketContext();
  const [fetching, setFetching] = useState(true);
  const contractAddress = getContractsAddrByChain(chainId);
  const [response, setResponse] = useState<
    Omit<Awaited<ReturnType<typeof fetch>>, "operation">
  >({ hasNext: true, stale: true, data: undefined, error: undefined });

  // useRef to store the latest response
  const latestResponse = useRef(response);

  useEffect(() => {
    latestResponse.current = response; // Update ref on every response change
  }, [response]);

  if (!contractAddress)
    console.error(`No contract address found for chain ${chainId}`);

  useEffect(() => {
    let subscritionId: SubscriptionId;
    if (connected && changeScope) {
      const onChangeEvent = (payload: ChangeEventScope) => {
        refetch().then((res) => setResponse(res));
      };
      subscritionId = subscribe(
        changeScope,
        onChangeEvent.bind({
          response,
          setResponse,
          chain: chainId,
        }),
      );
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
    retryCount: number,
  ): // @ts-ignore
  ReturnType<typeof fetch> => {
    const result = await fetch();
    if (!retryCount) {
      retryCount = 0;
    }
    if (
      (!result.error && !isEqual(result.data, latestResponse.current.data)) ||
      retryCount >= MAX_RETRIES - 1
    ) {
      if (retryCount === MAX_RETRIES - 1) {
        console.debug(`Max retries reached. (retry count: ${retryCount})`);
      } else {
        console.debug(
          `Subgraph result updated after ${retryCount + 1} retries.`,
        );
      }
      console.log({
        retryCount,
        resultData: result.data,
        oldResponseData: latestResponse.current.data,
        equal:
          JSON.stringify(result.data) ===
          JSON.stringify(latestResponse.current.data),
      });
      return result;
    } else {
      console.debug(
        `Subgraph result not yet updated, retrying with incremental delays... (retry count: ${retryCount + 1}/${MAX_RETRIES})`,
      );
      const delay = INITIAL_DELAY * 2 ** retryCount;
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
    init.bind({ setFetching, setResponse, fetch })();
  }, []);

  return { ...response, refetch, fetching };
}
