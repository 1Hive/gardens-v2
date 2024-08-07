import { useEffect, useState } from "react";
import { Maybe } from "graphql/jsutils/Maybe";
import { fetchIpfs } from "@/utils/ipfsUtils";

/**
 *
 * @param hash
 * @param modifier
 * @returns {
 * data: Result of the ipfs fetch or null if error, no hash or fetching;
 * fetching: true when fetching even if data was previously fetched;
 * error: Error | null;
 * }
 */
export const useIpfsFetch = <TResult>({
  hash,
  modifier,
  enabled = true,
}: {
  hash: Maybe<string>;
  modifier?: (rawResult: TResult) => TResult | Promise<TResult>;
  enabled?: boolean;
}): any => {
  const [data, setData] = useState<TResult | null>(null);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!hash || !enabled) {
      return;
    }
    setFetching(true);
    (async () => {
      try {
        let resp = await fetchIpfs<TResult>(hash);
        if (modifier) {
          resp = await modifier(resp);
        }
        setData(resp);
      } catch (e: any) {
        setError(e);
      } finally {
        setFetching(false);
      }
    })();
  }, [hash, enabled]);

  return { data, fetching, error };
};

export type MetadataV1 = {
  title: string;
  description: string;
};

export const useProposalMetadataIpfsFetch = ({
  hash,
  enabled,
}: {
  hash: Maybe<string>;
  enabled?: boolean;
}) => {
  const ipfs = useIpfsFetch<MetadataV1>({
    hash,
    enabled,
    modifier: (res) => {
      return {
        ...res,
        title: res.title || "No title found",
        description: res.description || "No description found",
      };
    },
  });
  return { ...ipfs, metadata: ipfs.data };
};
