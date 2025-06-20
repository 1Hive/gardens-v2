import { useState, useEffect, useRef } from "react";
import { Address, Chain, createPublicClient, http } from "viem";
import { erc721ABI, useAccount } from "wagmi";

const NFTs = {
  FirstHolder: "0x0c04af0f06d5762151245d0b7ef48170c49a1441",
  Protopian: [
    "0xCCac0bc52BF35d8F72d8dBEb780EEB9A4C1C5433",
    (tokenId: string) => tokenId.startsWith("2"),
  ],
  Keeper: [
    "0xCCac0bc52BF35d8F72d8dBEb780EEB9A4C1C5433",
    (tokenId: string) => tokenId.startsWith("1"),
  ],
} as const;

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
              const alchemyApiBase =
                "https://eth-mainnet.g.alchemy.com/nft/v3/" +
                process.env.NEXT_PUBLIC_ALCHEMY_KEY;

              const [collectionAddress, tokenIdSelector] = nftSelector;

              const response = await fetch(
                `${alchemyApiBase}/getNFTsForOwner?owner=${address}`,
              );

              if (!response.ok) {
                throw new Error("Failed to fetch NFTs from Alchemy");
              }

              const data = (await response.json()) as {
                ownedNfts: Array<{
                  tokenId: string;
                  contract: { address: string };
                }>;
              };

              const nfts = data.ownedNfts || [];
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
