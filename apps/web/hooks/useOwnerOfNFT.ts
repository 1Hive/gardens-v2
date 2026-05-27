import { useState, useEffect, useRef } from "react";
import { Address, Chain } from "viem";
import { erc721ABI, useAccount } from "wagmi";
import { getConfigByChain } from "@/configs/chains";
import { NFTs } from "@/globals";
import { getNftHolderFlagsForWallet } from "@/services/alchemy";
import { getEnvPublicClient } from "@/utils/publicClient";

interface UseOwnerOfNFTParams {
  chains: Chain[];
  nft: keyof typeof NFTs;
  enabled?: boolean;
}

interface UseOwnerOfNFTResult {
  isOwner: boolean | undefined;
  loading: boolean;
  error: string | null;
}

export function useOwnerOfNFT({
  nft,
  chains,
  enabled = true,
}: UseOwnerOfNFTParams): UseOwnerOfNFTResult {
  const [isOwner, setIsOwner] = useState<boolean | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { address } = useAccount();
  const fetching = useRef(false);
  const checkedKey = useRef<string | null>(null);
  const chainIdsKey = chains.map((chain) => chain.id).join(",");

  useEffect(() => {
    if (!enabled || !address || chains.length === 0) {
      checkedKey.current = null;
      fetching.current = false;
      setLoading(false);
      setIsOwner(undefined);
      setError(null);
      return;
    }

    const currentKey = `${address.toLowerCase()}:${nft}:${chainIdsKey}`;

    const checkOwnership = async () => {
      if (fetching.current || checkedKey.current === currentKey) return;

      checkedKey.current = currentKey;
      fetching.current = true;
      setLoading(true);
      setError(null);
      setIsOwner(undefined);

      try {
        let foundOwner = false;

        for (const chain of chains) {
          const nftSelector = NFTs[nft];
          if (!nftSelector) continue;

          try {
            if (Array.isArray(nftSelector)) {
              const alchemyApiBaseUrl =
                getConfigByChain(chain.id)?.alchemyApiBaseUrl;
              if (!alchemyApiBaseUrl) continue;

              const holderFlags = await getNftHolderFlagsForWallet(
                address,
                alchemyApiBaseUrl,
              );
              const hasNFT =
                (nft === "Protopian" && holderFlags.isProtopian) ||
                (nft === "Keeper" && holderFlags.isKeeper);

              if (hasNFT) {
                foundOwner = true;
                setIsOwner(true);
                break;
              }
            } else {
              const publicClient = getEnvPublicClient(chain.id);

              const contractAddress = nftSelector;

              const data = await publicClient.readContract({
                address: contractAddress as Address,
                abi: erc721ABI,
                functionName: "balanceOf",
                args: [address],
              });

              if (data && data > 0) {
                foundOwner = true;
                setIsOwner(true);
                break;
              }
            }
          } catch (err) {
            // if last iteration fails, we catch the error
            if (chain === chains[chains.length - 1]) {
              setError(
                err instanceof Error ?
                  err.message
                : "Failed to check ownership",
              );
            }
            continue;
          }
        }

        if (!foundOwner) {
          setIsOwner(false);
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to check ownership",
        );
      } finally {
        fetching.current = false;
        setLoading(false);
      }
    };

    checkOwnership();
  }, [address, chainIdsKey, enabled, nft]);

  return { isOwner, loading, error };
}
