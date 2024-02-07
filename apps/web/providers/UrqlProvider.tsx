"use client";

import { useMemo } from "react";
import {
  UrqlProvider as Provider,
  ssrExchange,
  cacheExchange,
  fetchExchange,
  createClient,
} from "@urql/next";

import { graphExchange } from "@graphprotocol/client-urql";
import * as GraphClient from "#/subgraph/.graphclient";
// urql provider for client components

// urql docs: https://formidable.com/open-source/urql/docs/advanced/server-side-rendering/#nextjs

//Subgraph URL
const subgraphURL = process.env.NEXT_PUBLIC_SUBGRAPH_URL || "";

console.log("subgraphURL", subgraphURL);

export default function UrqlProvider({ children }: React.PropsWithChildren) {
  const [client, ssr] = useMemo(() => {
    const ssr = ssrExchange();
    const client = createClient({
      url: subgraphURL,
      exchanges: [
        graphExchange(GraphClient),
        cacheExchange,
        ssr,
        fetchExchange,
      ],
      suspense: true,
    });

    return [client, ssr];
  }, []);

  return (
    <Provider client={client} ssr={ssr}>
      {children}
    </Provider>
  );
}
