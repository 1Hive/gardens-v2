"use client";

import { useMemo } from "react";
import { UrqlProvider as Provider } from "@urql/next";
import { initUrqlClient } from "./urql";
// urql provider for client components

// urql docs: https://formidable.com/open-source/urql/docs/advanced/server-side-rendering/#nextjs

//Subgraph URL
const subgraphURL = process.env.NEXT_PUBLIC_SUBGRAPH_URL || "";

console.log("subgraphURL", subgraphURL);

export default function UrqlProvider({ children }: React.PropsWithChildren) {
  const [client, ssr] = useMemo(() => {
    const { urqlClient: client, ssrCache: ssr } = initUrqlClient();

    return [client, ssr];
  }, []);

  return (
    <Provider client={client} ssr={ssr}>
      {children}
    </Provider>
  );
}
