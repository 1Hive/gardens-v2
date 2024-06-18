import { ChangeTopic } from "@/utils/pubsub";
import { AnyVariables, DocumentInput, OperationContext } from "@urql/next";
import useTopicChangeSubscription from "./useTopicChangeSubscription";
import { getContractsAddrByChain } from "@/constants/contracts";
import { useEffect, useState } from "react";
import { ChainId } from "@/types";
import { initUrqlClient } from "@/providers/urql";

export default function useSubgraphQueryByChain<
  Data = any,
  Variables extends AnyVariables = AnyVariables,
>(
  chain: ChainId,
  query: DocumentInput<any, Variables>,
  variables: Variables = {} as Variables,
  context?: Partial<OperationContext>,
  changeTopics?: ChangeTopic[],
) {
  const { urqlClient } = initUrqlClient();
  const { newEvent } = useTopicChangeSubscription(changeTopics ?? []);

  const contractAddress = getContractsAddrByChain(chain);
  const [response, setResponse] = useState<Omit<Awaited<ReturnType<typeof fetch>>, 'operation'>>({ hasNext: true, stale: true, data: undefined, error: undefined });

  if (!contractAddress) throw new Error(`No contract address found for chain ${chain}`);

  const fetch = (force: boolean) => urqlClient.query<Data>(query, variables, { ...context, url: contractAddress.subgraphUrl, requestPolicy: force ? 'network-only' : undefined },);

  useEffect(() => {
    fetch(false).then(setResponse);
  }, [newEvent, variables, query, changeTopics]);

  return { ...response, refetch: () => fetch(true) };
}