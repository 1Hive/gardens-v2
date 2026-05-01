import { Address } from "viem";
import { NFTs } from "@/globals";

export type NftHolderFlags = {
  isProtopian: boolean;
  isKeeper: boolean;
};

export async function getNFTsForWallet(
  ownerAddress: Address,
  alchemyApiBaseUrl =
    "https://eth-mainnet.g.alchemy.com/nft/v3/" +
    process.env.NEXT_PUBLIC_ALCHEMY_KEY,
) {
  const response = await fetch(
    `${alchemyApiBaseUrl}/getNFTsForOwner?owner=${ownerAddress}`,
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

type AlchemyNftOwner = {
  ownerAddress: Address;
  tokenBalances: { tokenId: string; balance?: string }[];
};

async function getOwnersForContract(
  contractAddress: Address | string,
  alchemyApiBaseUrl =
    "https://eth-mainnet.g.alchemy.com/nft/v3/" +
    process.env.NEXT_PUBLIC_ALCHEMY_KEY,
): Promise<AlchemyNftOwner[]> {
  const owners: AlchemyNftOwner[] = [];
  let pageKey: string | undefined;

  do {
    const params = new URLSearchParams({
      contractAddress,
      withTokenBalances: "true",
    });

    if (pageKey) {
      params.set("pageKey", pageKey);
    }

    const response = await fetch(
      `${alchemyApiBaseUrl}/getOwnersForContract?${params.toString()}`,
    );

    if (!response.ok) {
      throw new Error("Failed to fetch NFT owners from Alchemy");
    }

    const data = (await response.json()) as {
      owners: AlchemyNftOwner[];
      pageKey?: string;
    };

    owners.push(...data.owners);
    pageKey = data.pageKey;
  } while (pageKey);

  return owners;
}

export async function getNftHolderFlagsForWallet(
  ownerAddress: Address,
  alchemyApiBaseUrl =
    "https://eth-mainnet.g.alchemy.com/nft/v3/" +
    process.env.NEXT_PUBLIC_ALCHEMY_KEY,
): Promise<NftHolderFlags> {
  const [protopianCollectionAddress, protopianSelector] = NFTs.Protopian;
  const [keeperCollectionAddress, keeperSelector] = NFTs.Keeper;

  if (
    protopianCollectionAddress.toLowerCase() !==
    keeperCollectionAddress.toLowerCase()
  ) {
    throw new Error("Protopian and Keeper NFTs must share the same collection");
  }

  const owners = await getOwnersForContract(
    protopianCollectionAddress,
    alchemyApiBaseUrl,
  );
  const owner = owners.find(
    (candidate) =>
      candidate.ownerAddress.toLowerCase() === ownerAddress.toLowerCase(),
  );

  return {
    isProtopian:
      owner?.tokenBalances.some((tb) => protopianSelector(tb.tokenId)) ?? false,
    isKeeper:
      owner?.tokenBalances.some((tb) => keeperSelector(tb.tokenId)) ?? false,
  };
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

  const owners = await getOwnersForContract(
    protopianCollectionAddress,
    alchemyApiBase,
  );

  return owners.reduce<Record<Address, NftHolderFlags>>((acc, owner) => {
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
