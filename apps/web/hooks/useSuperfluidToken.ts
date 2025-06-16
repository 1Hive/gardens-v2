import { useEffect, useState } from "react";
import { Client, gql } from "urql";
import { Address } from "viem";
import { ChainId } from "@/types";
import { useSuperfluidSugraphClient } from "./useSuperfluidSubgraphClient";

export const SUPER_TOKEN_QUERY = gql`
  query superToken($token: String!) {
    tokens(
      where: { underlyingToken: $token }
      orderBy: isListed
      orderDirection: desc
    ) {
      name
      symbol
      id
      isListed
    }
  }
`;

type SuperToken = {
  name: string;
  symbol: string;
  id: Address;
  isListed: boolean;
};

export function useSuperfluidToken({
  token,
  chainId,
}: {
  token: string;
  chainId?: ChainId;
}) {
  const [superToken, setSuperToken] = useState<SuperToken | null>(null);
  const [isFetching, setIsFetching] = useState(false);

  const client = useSuperfluidSugraphClient({ chainId });

  const fetch = async (_client: Client, _token: string) => {
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
          returnedTokens.length > 0 ? (foundSuperToken as SuperToken) : null,
        );
      }
    } catch (error) {
      console.error("Something went wrong while fetching super token: ", error);
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    if (!client || !token) return;
    fetch(client, token);
  }, [client, token]);

  return { superToken, refetch: fetch, isFetching };
}
