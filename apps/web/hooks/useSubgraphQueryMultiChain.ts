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
import { debounce } from "lodash-es";
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

  const fetchDebounce = debounce(
    (chainsOverride?: ChainId[]) =>
      Promise.all(
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
      ).then((result) => {
        const errorsRecord: Record<ChainId, CombinedError> = {};
        result.forEach((r, i) => {
          if (r.error) {
            errorsRecord[(chains ?? allChains)[i]] = r.error;
          }
        });
        setErrorsByChain(errorsRecord);
        const res = result.flatMap((r) => r.data).filter((x): x is Data => !!x);
        setResult(res);
      }),
    200,
  );

  return { data: result, errorsByChain, refetch: fetchDebounce };
}
