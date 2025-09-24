import {
  AnyVariables,
  Client,
  createClient,
  DocumentInput,
  fetchExchange,
  OperationContext,
  ssrExchange,
} from "urql";
import { getConfigByChain } from "@/configs/chains";
import { ChainId } from "@/types";

let urqlRecord: Record<
  ChainId | "default",
  [Client, ReturnType<typeof ssrExchange>]
> = {};

const isServer = typeof window === "undefined";

//Subgraph URL
const arbsepConfig = getConfigByChain(421614);
const subgraphArbSepURL =
  arbsepConfig?.publishedSubgraphUrl ?? arbsepConfig?.subgraphUrl;

/**
 * Function to initialize urql client. can be used both on client and server
 * @param initialState -  usually the data from the server returned as props
 * @param url - graphql endpoint
 * @returns and object with urqlClient and ssrCache
 */
export function initUrqlClient(
  {
    initialState,
    chainId,
  }: { initialState?: any; chainId: ChainId | "default" } = {
    chainId: "default",
  },
) {
  if (!urqlRecord[chainId]) {
    //fill the client with initial state from the server.
    const ssr = ssrExchange({ initialState, isClient: !isServer });
    const urqlClient = createClient({
      url: subgraphArbSepURL!,
      exchanges: [
        // cacheExchange,
        // authExchange(async (util) => {
        //   return {
        //     didAuthError() {
        //       return false;
        //     },
        //     async refreshAuth() {},

        //     addAuthToOperation(operation) {
        //       if (!operation.context.url) {
        //         return operation;
        //       }

        //       const { url, fetchOptions } = operation.context;
        //       const options =
        //         typeof fetchOptions === "function"
        //           ? fetchOptions()
        //           : fetchOptions;

        //       const context = {
        //         ...operation.context,
        //         // url: "http://localhost:8000/subgraphs/name/your-subgraph-name",
        //         url: url,
        //       };
        //       return makeOperation(operation.kind, operation, context);
        //     },
        //   };
        // }),

        // ssrCache,
        fetchExchange,
      ],
      suspense: true,
    });

    urqlRecord[chainId] = [urqlClient, ssr];
  } else {
    //when navigating to another page, client is already initialized.
    //lets restore that page's initial state
    urqlRecord[chainId][1].restoreData(initialState);
  }

  // Return both the Client instance and the ssrCache.
  return {
    urqlClient: urqlRecord[chainId][0],
    ssrCache: urqlRecord[chainId][1],
  };
}

export async function queryByChain<
  Data = any,
  Variables extends AnyVariables = AnyVariables,
>(
  urqlClient: Client,
  chainId: string | number,
  query: DocumentInput<any, Variables>,
  variables: Variables = {} as Variables,
  context?: Partial<OperationContext>,
) {
  const config = getConfigByChain(chainId);
  if (!config) {
    throw new Error("Chain not supported");
  }
  return urqlClient.query<Data>(query, variables, {
    url:
      process.env.NEXT_PUBLIC_SKIP_PUBLISHED ?
        config.subgraphUrl
      : (config.publishedSubgraphUrl ?? config.subgraphUrl),
    ...context,
  });
}
