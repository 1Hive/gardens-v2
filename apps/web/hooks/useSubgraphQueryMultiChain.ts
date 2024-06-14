import { ChangeTopic } from "@/utils/pubsub";
import { AnyVariables, Client, CombinedError, DocumentInput, OperationContext, OperationResultSource } from "@urql/next";
import useChangeSubscription from "./useChangeSubscription";
import { getContractsAddrByChain } from "@/constants/contracts";
import { useEffect, useState } from "react";
import { localhost, arbitrumSepolia, optimismSepolia, sepolia } from "viem/chains";
import { ChainId } from "@/types";
import { debounce } from "lodash-es";
import { initUrqlClient } from "@/providers/urql";

const allChains = [
  localhost.id,
  arbitrumSepolia.id,
  optimismSepolia.id,
  sepolia.id,
];

export default function useSubgraphQueryMultiChain<
  Data = any,
  Variables extends AnyVariables = AnyVariables,
>(
  query: DocumentInput<any, Variables>,
  variables: Variables = {} as Variables,
  context?: Partial<OperationContext>,
  changeTopics?: ChangeTopic[],
  chains?: ChainId[],
) {
  const { newEvent } = useChangeSubscription(changeTopics ?? []);

  const contractAddresses = (chains ?? allChains).map((chain) => getContractsAddrByChain(chain)).filter((x): x is { subgraphUrl: string } => !!x?.subgraphUrl);
  const [result, setResult] = useState<Data[]>();
  const [errorsByChain, setErrorsByChain] = useState<Record<ChainId, any>>();

  const fetchDebounce = debounce(() => Promise.all(contractAddresses.map
    (async (address, i) => {
      try {
        const { urqlClient } = initUrqlClient({ chainId: (chains ?? allChains)[i] });
        return await urqlClient.query<Data>(query, variables, { ...context, url: address.subgraphUrl, requestPolicy: 'network-only' });
      } catch (error: any) {
        console.error("Error occured while fetching query", error);
        return { error, data: undefined };
      }
    })).then(result => {
      const errorsRecord: Record<ChainId, CombinedError> = {};
      result.forEach((r, i) => {
        if (r.error) {
          errorsRecord[(chains ?? allChains)[i]] = r.error;
        }
      });
      setErrorsByChain(errorsRecord);
      const res = result.flatMap((r) => r.data).filter((x): x is Data => !!x);
      setResult(res);
    }), 200);

  useEffect(() => {
    console.log('newEvent', newEvent);
    fetchDebounce();
  }, [newEvent]);

  return { data: result, errorsByChain, refetch: fetchDebounce };
}

