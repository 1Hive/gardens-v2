import { useEffect, useState } from "react";
import { Client, gql } from "urql";
import { Address } from "viem";
import { useSuperfluidSugraphClient } from "./useSuperfluidSubgraphClient";
import { ChainId } from "@/types";

export const SUPER_TOKEN_QUERY = gql`
  query superToken($token: String!) {
    tokens(
      where: {
        and: [
          { isListed: true }
          { or: [{ underlyingToken: $token }, { id: $token }] }
        ]
      }
      orderBy: isListed
      orderDirection: desc
    ) {
      name
      symbol
      id
    }
  }
`;

export type SuperToken = {
  name: string;
  symbol: string;
  id: Address;
  underlyingToken: Address;
  sameAsUnderlying?: boolean;
};

export function useSuperfluidToken({
  token,
  chainId,
  enabled = true,
}: {
  token?: string;
  chainId?: ChainId;
  enabled?: boolean;
}) {
  const [superToken, setSuperToken] = useState<SuperToken | null>(null);
  const [isFetching, setIsFetching] = useState(false);

  const client = useSuperfluidSugraphClient({ chainId });

  const fetch: (client: Client, token: string) => Promise<void> = async (
    _client: Client,
    _token: string,
  ): Promise<void> => {
    setIsFetching(true);
    try {
      const result = await _client.query(SUPER_TOKEN_QUERY, {
        token: _token.toLowerCase(),
      });
      if (!result || result?.error)
        console.error(
          "Something wrong while fetching superfluid token",
          result?.error,
        );
      else {
        const returnedTokens = result.data.tokens as SuperToken[];
        const foundSuperToken = returnedTokens?.[0];
        if (!foundSuperToken) {
          console.debug("Superfluid token not found");
        }
        setSuperToken(
          returnedTokens.length > 0 ?
            ({
              ...foundSuperToken,
              underlyingToken: token,
              sameAsUnderlying:
                foundSuperToken.id.toLowerCase() === token?.toLowerCase(),
            } as SuperToken)
          : null,
        );
      }
    } catch (error) {
      console.error("Something went wrong while fetching super token: ", error);
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    if (!client || !token || !enabled) return;
    fetch(client, token);
  }, [client, token, enabled]);

  return {
    superToken,
    refetch: fetch,
    isFetching,
    setSuperToken,
  };
}
