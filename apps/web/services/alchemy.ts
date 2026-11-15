import { Address } from "viem";
import { NFTs } from "@/globals";

export type NftHolderFlags = {
  isProtopian: boolean;
  isKeeper: boolean;
};

const pendingNftHolderChecks = new Map<string, Promise<NftHolderFlags>>();
const MAX_NFT_PAGES = 50;

class AlchemyMonthlyCapacityError extends Error {
  constructor() {
    super("Alchemy monthly capacity exceeded");
    this.name = "AlchemyMonthlyCapacityError";
  }
}

function resolveAlchemyKey(): string {
  const key =
    process.env.SERVER_ALCHEMY_KEY || process.env.NEXT_PUBLIC_ALCHEMY_KEY;
  if (!key) {
    throw new Error("Missing Alchemy API key (set SERVER_ALCHEMY_KEY)");
  }
  return key;
}

function getAlchemyNftApiBase(): string {
  // Allow full override for testing or non-mainnet networks
  const explicitBase = process.env.ALCHEMY_NFT_API_BASE;
  if (explicitBase) return explicitBase.replace(/\/$/, "");
  const key = resolveAlchemyKey();
  return `https://eth-mainnet.g.alchemy.com/nft/v3/${key}`;
}

async function fetchWithRetry(
  url: string,
  init?: RequestInit,
  opts: { attempts?: number; backoffMs?: number } = {},
): Promise<Response> {
  const attempts = opts.attempts ?? 4;
  const baseBackoff = opts.backoffMs ?? 500;
  let lastError: unknown;

  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, init);
      // Monthly capacity cannot recover through retries. Short throughput
      // limits can, so retain the existing backoff for other 429 responses.
      if (res.status === 429) {
        const body = await res
          .clone()
          .text()
          .catch(() => "");
        if (body.includes("Monthly capacity limit exceeded")) {
          console.warn("Alchemy monthly capacity exceeded; skipping retries");
          throw new AlchemyMonthlyCapacityError();
        }
      }
      if (res.status === 429 || (res.status >= 500 && res.status < 600)) {
        if (i === attempts - 1) return res;
        const retryAfter = Number(res.headers.get("retry-after") ?? "0");
        const delayMs =
          retryAfter > 0 ? retryAfter * 1000 : baseBackoff * (i + 1) ** 2;
        await new Promise((r) => setTimeout(r, delayMs));
        continue;
      }
      return res;
    } catch (err) {
      if (err instanceof AlchemyMonthlyCapacityError) throw err;
      lastError = err;
      // Exponential backoff on network failures
      if (i < attempts - 1) {
        await new Promise((r) => setTimeout(r, baseBackoff * (i + 1) ** 2));
      }
    }
  }

  if (lastError instanceof Error) throw lastError;
  throw new Error("Alchemy fetch failed after retries");
}

export async function getNFTsForWallet(
  ownerAddress: Address,
  alchemyApiBaseUrl?: string,
  contractAddress?: Address | string,
) {
  const base = (alchemyApiBaseUrl ?? getAlchemyNftApiBase()).replace(/\/$/, "");
  const ownedNfts: Array<{ tokenId: string; contract: { address: string } }> =
    [];
  let pageKey: string | undefined;
  const seenPageKeys = new Set<string>();

  for (let page = 0; page < MAX_NFT_PAGES; page++) {
    const params = new URLSearchParams({
      owner: ownerAddress,
      withMetadata: "false",
    });
    if (contractAddress) params.append("contractAddresses[]", contractAddress);
    if (pageKey) params.set("pageKey", pageKey);

    const response = await fetchWithRetry(
      `${base}/getNFTsForOwner?${params.toString()}`,
    );
    if (!response.ok) {
      throw new Error(`Failed to fetch NFTs from Alchemy (${response.status})`);
    }

    const data = (await response.json()) as {
      ownedNfts: typeof ownedNfts;
      pageKey?: string;
    };
    ownedNfts.push(...data.ownedNfts);
    pageKey = data.pageKey;
    if (!pageKey) return ownedNfts;
    if (seenPageKeys.has(pageKey)) {
      throw new Error("Alchemy returned a repeated NFT page key");
    }
    seenPageKeys.add(pageKey);
  }

  throw new Error(`Alchemy NFT pagination exceeded ${MAX_NFT_PAGES} pages`);
}

type AlchemyNftOwner = {
  ownerAddress: Address;
  tokenBalances: { tokenId: string; balance?: string }[];
};

async function getOwnersForContract(
  contractAddress: Address | string,
  alchemyApiBaseUrl?: string,
): Promise<AlchemyNftOwner[]> {
  const owners: AlchemyNftOwner[] = [];
  let pageKey: string | undefined;
  const base = (alchemyApiBaseUrl ?? getAlchemyNftApiBase()).replace(/\/$/, "");

  do {
    const params = new URLSearchParams({
      contractAddress,
      withTokenBalances: "true",
    });

    if (pageKey) {
      params.set("pageKey", pageKey);
    }

    const response = await fetchWithRetry(
      `${base}/getOwnersForContract?${params.toString()}`,
    );

    if (!response.ok) {
      console.error(
        `Alchemy API error: ${response.status} ${response.statusText}`,
      );
      response.text().then((text) => console.error(`Response body: ${text}`));
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
  alchemyApiBaseUrl?: string,
): Promise<NftHolderFlags> {
  const base = (alchemyApiBaseUrl ?? getAlchemyNftApiBase()).replace(/\/$/, "");
  const requestKey = `${base}:${ownerAddress.toLowerCase()}`;
  const pending = pendingNftHolderChecks.get(requestKey);
  if (pending) return pending;

  const request = fetchNftHolderFlagsForWallet(ownerAddress, base);
  pendingNftHolderChecks.set(requestKey, request);
  try {
    return await request;
  } finally {
    pendingNftHolderChecks.delete(requestKey);
  }
}

async function fetchNftHolderFlagsForWallet(
  ownerAddress: Address,
  alchemyApiBaseUrl: string,
): Promise<NftHolderFlags> {
  const [protopianCollectionAddress, protopianSelector] = NFTs.Protopian;
  const [keeperCollectionAddress, keeperSelector] = NFTs.Keeper;

  if (
    protopianCollectionAddress.toLowerCase() !==
    keeperCollectionAddress.toLowerCase()
  ) {
    throw new Error("Protopian and Keeper NFTs must share the same collection");
  }

  const nfts = await getNFTsForWallet(
    ownerAddress,
    alchemyApiBaseUrl,
    protopianCollectionAddress,
  );

  return {
    isProtopian: nfts.some((nft) => protopianSelector(nft.tokenId)),
    isKeeper: nfts.some((nft) => keeperSelector(nft.tokenId)),
  };
}

export async function getNftHoldersByAddress(): Promise<
  Record<Address, NftHolderFlags>
> {
  const alchemyApiBase = getAlchemyNftApiBase();

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
      isProtopian: owner.tokenBalances.some((tb) =>
        protopianSelector(tb.tokenId),
      ),
      isKeeper: owner.tokenBalances.some((tb) => keeperSelector(tb.tokenId)),
    };

    if (!next.isProtopian && !next.isKeeper) {
      return acc;
    }

    acc[ownerAddress] = next;
    return acc;
  }, {});
}
