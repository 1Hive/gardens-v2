import { Address } from "viem";
import { NFTs } from "@/globals";

export async function getNFTsForWallet(ownerAddress: Address) {
  const alchemyApiBase =
    "https://eth-mainnet.g.alchemy.com/nft/v3/" +
    process.env.NEXT_PUBLIC_ALCHEMY_KEY;

  const response = await fetch(
    `${alchemyApiBase}/getNFTsForOwner?owner=${ownerAddress}`,
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

  return data.ownedNfts || [];
}

export async function getProtopiansOwners() {
  const alchemyApiBase =
    "https://eth-mainnet.g.alchemy.com/nft/v3/" +
    process.env.NEXT_PUBLIC_ALCHEMY_KEY;

  const [collectionAddress, selector] = NFTs.Protopian;
  const response = await fetch(
    `${alchemyApiBase}/getOwnersForContract?contractAddress=${collectionAddress}&withTokenBalances=true`,
  );

  if (!response.ok) {
    throw new Error("Failed to fetch NFT owners from Alchemy");
  }

  const data = (await response.json()) as {
    owners: Array<{
      ownerAddress: Address;
      tokenBalances: { tokenId: string }[];
    }>;
  };

  return (
    data.owners
      .filter((o) => o.tokenBalances.find((tb) => selector(tb.tokenId)))
      .map((x) => x.ownerAddress) || []
  );
}
