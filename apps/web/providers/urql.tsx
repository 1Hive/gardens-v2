import {
  AnyVariables,
  Client,
  createClient,
  fetchExchange,
  DocumentInput,
  OperationContext,
  ssrExchange,
} from "urql";

import { getContractsAddrByChain } from "@/constants/contracts";
let urqlClient: Client | null = null;

let ssrCache: ReturnType<typeof ssrExchange>;

const isServer = typeof window === "undefined";

const subgraphURL = process.env.NEXT_PUBLIC_SUBGRAPH_URL || "";
/**
 * Function to initialize urql client. can be used both on client and server
 * @param initialState -  usually the data from the server returned as props
 * @param url - graphql endpoint
 * @returns and object with urqlClient and ssrCache
 */
export function initUrqlClient({ initialState }: { initialState?: any } = {}) {
  if (!urqlClient) {
    //fill the client with initial state from the server.
    ssrCache = ssrExchange({ initialState, isClient: !isServer });

    urqlClient = createClient({
      url: subgraphURL,
      exchanges: [
        // cacheExchange,
        // authExchange(async (util) => {
        //   // console.log("util", util);
        //   return {
        //     didAuthError() {
        //       console.log("didAuthError");
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
  } else {
    //when navigating to another page, client is already initialized.
    //lets restore that page's initial state
    ssrCache.restoreData(initialState);
  }

  // Return both the Client instance and the ssrCache.
  return { urqlClient, ssrCache };
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
  const addrs = getContractsAddrByChain(chainId);
  if (!addrs) {
    throw new Error("Chain not supported");
  }

  return await urqlClient.query<Data>(query, variables, {
    url: addrs.subgraphUrl,
    ...context,
  });
}

export async function subscribeByChain<
  Data = any,
  Variables extends AnyVariables = AnyVariables,
>(
  urqlClient: Client,
  chainId: string | number,
  query: DocumentInput<any, Variables>,
  variables: Variables = {} as Variables,
  context?: Partial<OperationContext>,
) {
  const addrs = getContractsAddrByChain(chainId);
  if (!addrs) {
    throw new Error("Chain not supported");
  }

  return await urqlClient.subscription<Data>(query, variables, {
    url: addrs.subgraphUrl,
    ...context,
  });
}
