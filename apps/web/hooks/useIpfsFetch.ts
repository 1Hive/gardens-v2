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
export const useIpfsFetch = <TResult>(
  hash: Maybe<string>,
  modifier?: (rawResult: TResult) => TResult | Promise<TResult>,
) => {
  const [data, setData] = useState<TResult | null>(null);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    (async () => {
      if (!hash) {
        return;
      }
      setFetching(true);
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
  }, [hash]);

  return { data, loading: fetching, error };
};

export type MetadataV1 = {
  title: string;
  description: string;
};

export const useProposalMetadataIpfsFetch = (hash: Maybe<string>) => {
  const ipfs = useIpfsFetch<MetadataV1>(hash, (res) => {
    return {
      ...res,
      title: res.title || "No title found",
      description: res.description || "No description found",
    };
  });
  return { ...ipfs, metadata: ipfs.data };
};
