import { useState, useEffect } from "react";
import { Address, Chain, createPublicClient, http } from "viem";
import { erc721ABI, useAccount } from "wagmi";

const NFTs = {
  FirstHolder: "0x0c04af0f06d5762151245d0b7ef48170c49a1441",
};

interface UseOwnerOfNFTParams {
  chains: Chain[];
  nft: keyof typeof NFTs;
  enabled?: boolean;
}

interface UseOwnerOfNFTResult {
  isOwner: boolean;
  loading: boolean;
  error: string | null;
}

export function useOwnerOfNFT({
  nft,
  chains,
  enabled = true,
}: UseOwnerOfNFTParams): UseOwnerOfNFTResult {
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { address } = useAccount();

  useEffect(() => {
    if (!enabled || !address || chains.length === 0) {
      return;
    }

    const checkOwnership = async () => {
      setLoading(true);
      setError(null);

      try {
        for (const chain of chains) {
          const contractAddress = NFTs[nft];
          if (!contractAddress) continue;

          try {
            const publicClient = createPublicClient({
              chain: chain,
              transport: http(),
            });

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
