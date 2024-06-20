import {
  AnyVariables,
  CombinedError,
  DocumentInput,
  OperationContext,
} from "@urql/next";
import { getContractsAddrByChain } from "@/constants/contracts";
import { useEffect, useState } from "react";
import {
  localhost,
  arbitrumSepolia,
  optimismSepolia,
  sepolia,
} from "viem/chains";
import { ChangeEventTopic } from "@/pages/api/websocket.api";
import { initUrqlClient } from "@/providers/urql";
import { ChainId } from "@/types";
import { debounce, set } from "lodash-es";
import {
  SubscriptionId,
  useWebSocketContext,
} from "@/contexts/websocket.context";

const allChains: ChainId[] = [
  sepolia.id,
  arbitrumSepolia.id,
  optimismSepolia.id,
];

if (process.env.NODE_ENV === "development") {
  allChains.push(localhost.id);
}

export default function useSubgraphQueryMultiChain<
  Data = any,
  Variables extends AnyVariables = AnyVariables,
>(
  query: DocumentInput<any, Variables>,
  variables: Variables = {} as Variables,
  context?: Partial<OperationContext>,
  changeTopics?: ChangeEventTopic[],
  chains?: ChainId[],
) {
  const { connected, subscribe, unsubscribe } = useWebSocketContext();

  const contractAddresses = (chains ?? allChains)
    .map((chain) => getContractsAddrByChain(chain))
    .filter((x): x is { subgraphUrl: string } => !!x?.subgraphUrl);
  const [result, setResult] = useState<Data[]>();
  const [errorsByChain, setErrorsByChain] = useState<Record<ChainId, any>>();
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    fetchDebounce();
  }, []);

  useEffect(() => {
    let subscritionId: SubscriptionId;
    if (connected) {
      subscribe(changeTopics ?? [], (payload) => {
        console.debug("Received change event", payload);
        fetchDebounce(payload.chainId ? [payload.chainId] : undefined);
      });
    }

    return () => {
      if (subscritionId) {
        unsubscribe(subscritionId);
      }
    };
  }, [connected]);

  const fetchDebounce = debounce(async (chainsOverride?: ChainId[]) => {
    setFetching(true);
    const allResults = await Promise.all(
      contractAddresses.map(async (address, i) => {
        try {
          const { urqlClient } = initUrqlClient({
            chainId: (chainsOverride ?? chains ?? allChains)[i],
          });
          return await urqlClient.query<Data>(query, variables, {
            ...context,
            url: address.subgraphUrl,
          } as OperationContext & { _instance: any });
        } catch (error: any) {
          console.error("Error occured while fetching query", error);
          return { error, data: undefined };
        }
      }),
    );
    const errorsRecord: Record<ChainId, CombinedError> = {};
    allResults.forEach((r, i_1) => {
      if (r.error) {
        errorsRecord[(chains ?? allChains)[i_1]] = r.error;
      }
    });
    setErrorsByChain(errorsRecord);
    const res = allResults
      .flatMap((r_1) => r_1.data)
      .filter((x): x is Data => !!x);
    setResult(res);
    setFetching(false);
  }, 200);

  return { data: result, errorsByChain, refetch: fetchDebounce, fetching };
}
