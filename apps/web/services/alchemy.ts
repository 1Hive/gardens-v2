import { Address } from "viem";
import { NFTs } from "@/globals";

export type NftHolderFlags = {
  isProtopian: boolean;
  isKeeper: boolean;
};

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

  return data.ownedNfts;
}

export async function getNftHoldersByAddress(): Promise<
  Record<Address, NftHolderFlags>
> {
  const alchemyApiBase =
    "https://eth-mainnet.g.alchemy.com/nft/v3/" +
    process.env.NEXT_PUBLIC_ALCHEMY_KEY;

  const [protopianCollectionAddress, protopianSelector] = NFTs.Protopian;
  const [keeperCollectionAddress, keeperSelector] = NFTs.Keeper;

  if (
    protopianCollectionAddress.toLowerCase() !==
    keeperCollectionAddress.toLowerCase()
  ) {
    throw new Error("Protopian and Keeper NFTs must share the same collection");
  }

  const response = await fetch(
    `${alchemyApiBase}/getOwnersForContract?contractAddress=${protopianCollectionAddress}&withTokenBalances=true`,
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

  return data.owners.reduce<Record<Address, NftHolderFlags>>((acc, owner) => {
    const ownerAddress = owner.ownerAddress.toLowerCase() as Address;
    const next = {
      isProtopian: owner.tokenBalances.some((tb) => protopianSelector(tb.tokenId)),
      isKeeper: owner.tokenBalances.some((tb) => keeperSelector(tb.tokenId)),
    };

    if (!next.isProtopian && !next.isKeeper) {
      return acc;
    }

    acc[ownerAddress] = next;
    return acc;
  }, {});
}
