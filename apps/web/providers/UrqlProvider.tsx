"use client";

import { useEffect, useMemo } from "react";
import { UrqlProvider as Provider } from "@urql/next";
import { initUrqlClient } from "./urql";

// urql provider for client components

// urql docs: https://formidable.com/open-source/urql/docs/advanced/server-side-rendering/#nextjs

//Subgraph URL
const subgraphArbSepURL = process.env.NEXT_PUBLIC_SUBGRAPH_URL_ARB_SEP || "";
const subgraphOpSepURL = process.env.NEXT_PUBLIC_SUBGRAPH_URL_OP_SEP || "";

export default function UrqlProvider({ children }: React.PropsWithChildren) {
  const [client, ssr] = useMemo(() => {
    const { urqlClient: client, ssrCache: ssr } = initUrqlClient();
    return [client, ssr];
  }, []);

  useEffect(() => {
    console.log("subgraph ArbSepURL", subgraphArbSepURL);
    console.log("subgraph OpSepURL", subgraphOpSepURL);
  }, []);

  return (
    <Provider client={client} ssr={ssr}>
      {children}
    </Provider>
  );
}
