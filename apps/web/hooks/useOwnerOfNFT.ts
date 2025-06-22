import { useState, useEffect, useRef } from "react";
import { Address, Chain, createPublicClient, http } from "viem";
import { erc721ABI, useAccount } from "wagmi";
import { NFTs } from "@/globals";
import { getNFTsForWallet } from "@/services/alchemy";

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

  useEffect(() => {
    if (!enabled || !address || chains.length === 0) {
      return;
    }

    const checkOwnership = async () => {
      if (loading || isOwner != null || fetching.current) return; // Prevent multiple calls if already loading
      fetching.current = true;
      setLoading(true);
      setError(null);

      try {
        for (const chain of chains) {
          const nftSelector = NFTs[nft];
          if (!nftSelector) continue;

          try {
            if (Array.isArray(nftSelector)) {
              // Use alchemy to fetch all NFTs for the address
              // TODO: Unhardcode for testnets
              const [collectionAddress, tokenIdSelector] = nftSelector;
              const nfts = await getNFTsForWallet(address);
              const hasNFT = nfts.some(
                (x) =>
                  x.contract.address.toLowerCase() ===
                    collectionAddress.toLowerCase() &&
                  tokenIdSelector(x.tokenId),
              );

              if (hasNFT) {
                setIsOwner(true);
                break;
              }
            } else {
              const publicClient = createPublicClient({
                chain: chain,
                transport: http(),
              });

              const contractAddress = nftSelector;

              const data = await publicClient.readContract({
                address: contractAddress as Address,
                abi: erc721ABI,
                functionName: "balanceOf",
                args: [address],
              });

              if (data && data > 0) {
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
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to check ownership",
        );
      } finally {
        setLoading(false);
      }
    };

    checkOwnership();
  }, [address, chains, enabled]);

  return { isOwner, loading, error };
}
