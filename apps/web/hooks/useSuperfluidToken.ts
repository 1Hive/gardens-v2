import { useEffect, useState } from "react";
import { Client, gql } from "urql";
import { Address, parseAbi, zeroAddress } from "viem";
import { usePublicClient } from "wagmi";
import { useSuperfluidSugraphClient } from "./useSuperfluidSubgraphClient";
import { ChainId } from "@/types";

export const SUPER_TOKEN_QUERY = gql`
  query superToken($token: String!) {
    tokens(
      where: { and: [{ or: [{ underlyingToken: $token }, { id: $token }] }] }
      orderBy: isListed
      orderDirection: desc
    ) {
      id
      name
      isListed
      symbol
      createdAtBlockNumber
    }
  }
`;

export type SuperToken = {
  name: string;
  symbol: string;
  id: Address;
  underlyingToken: Address;
  isListed?: boolean;
  sameAsUnderlying?: boolean;
  createdAtBlockNumber?: string;
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
  const publicClient = usePublicClient();
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
        // Iterate on supertoken to find the first metting the criteria:
        // - underlyingToken matches the token
        // - isListed is true
        // - a contract read on it on the admin field should return zero address and only one upgraded event

        // Check if same as underlying token
        let foundSuperToken = returnedTokens.find(
          (t) => t.id.toLowerCase() === _token.toLowerCase(),
        );

        if (!foundSuperToken) {
          for (const returnedToken of returnedTokens) {
            if (returnedToken.id.toLowerCase() === token?.toLowerCase()) {
              foundSuperToken = returnedToken;
              break;
            }

            // Is listed
            if (returnedToken.isListed) {
              foundSuperToken = returnedToken;
              break;
            }

            // Query the contract to check if it has been upgraded
            const adminChangedAbi = parseAbi([
              "event AdminChanged(address indexed previousAdmin, address indexed newAdmin)",
            ]);

            const createdAtBlock = BigInt(
              returnedToken.createdAtBlockNumber ?? "latest",
            );
            const logs = await publicClient.getLogs({
              address: returnedToken.id,
              event: adminChangedAbi[0],
              fromBlock: createdAtBlock,
              toBlock: createdAtBlock,
            });

            const firstZeroEvent = logs.find(
              (log) =>
                log.args?.previousAdmin?.toLowerCase() === zeroAddress &&
                log.args?.newAdmin?.toLowerCase() === zeroAddress,
            );

            if (firstZeroEvent) {
              foundSuperToken = returnedToken;
            }
          }
        }

        if (!foundSuperToken) {
          console.debug("Superfluid token not found");
          setSuperToken(null);
          return;
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
