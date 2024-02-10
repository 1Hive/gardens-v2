// urql/useClient.tsx
import { useMemo } from "react";
import { initUrqlClient } from "../providers/urql";

/**
 * Simple hook to initialize the client with the pageProps.
 * @returns urqlClient
 */
export const useUrqlClient = () => {
  // const urqlData = pageProps.URQL_DATA;
  const { urqlClient } = useMemo(() => {
    return initUrqlClient();
  }, []);

  return urqlClient;
};
