import pinataSDK from "@pinata/sdk";
import { buildIpfsUrl, isValidCid } from "@/utils/ipfs";

type SupportedPlatform =
  | "ethereum"
  | "polygon-pos"
  | "celo"
  | "base"
  | "xdai"
  | "arbitrum-one"
  | "optimistic-ethereum";

type SupportedCoinId = "ethereum" | "matic-network" | "celo" | "xdai";
type PriceCacheEntry = { value: number; expiresAt: number; symbol?: string };

const getBaseUrl = () => {
  if (process.env.COINGECKO_API_BASE) return process.env.COINGECKO_API_BASE;
  const apiKey = process.env.COINGECKO_API_KEY?.toLowerCase() ?? "";
  const isDemo = apiKey.startsWith("demo");
  if (isDemo) {
    return "https://api.coingecko.com/api/v3";
  }
  const usePro = process.env.COINGECKO_USE_PRO?.toLowerCase() === "true";
  return usePro ?
      "https://pro-api.coingecko.com/api/v3"
    : "https://api.coingecko.com/api/v3";
};

const PLATFORM_BY_CHAIN: Record<number, SupportedPlatform> = {
  1: "ethereum",
  137: "polygon-pos",
  42220: "celo",
  8453: "base",
  100: "xdai",
  42161: "arbitrum-one",
  10: "optimistic-ethereum",
};

const GAS_TOKEN_COIN_ID_BY_CHAIN: Record<number, SupportedCoinId> = {
  1: "ethereum",
  10: "ethereum",
  100: "xdai",
  137: "matic-network",
  8453: "ethereum",
  42220: "celo",
  42161: "ethereum",
  421614: "ethereum",
  11155111: "ethereum",
  11155420: "ethereum",
};

const COINGECKO_TOKEN_PRICE_URL = (
  platform: SupportedPlatform,
  baseUrl: string,
) => `${baseUrl}/simple/token_price/${platform}`;

const COINGECKO_COIN_PRICE_URL = (baseUrl: string) =>
  `${baseUrl}/simple/price`;
const COINGECKO_PRICE_CACHE_NAME =
  process.env.COINGECKO_PRICE_CACHE_NAME ??
  process.env.SUPERFLUID_PRICE_CACHE_NAME ??
  "token-prices";
const COINGECKO_PRICE_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const PINATA_GROUP_ID =
  process.env.PINATA_GROUP_ID ?? "37bf2b9a-5a2e-4049-b138-8b1e180d44a4";

type OverrideEntry =
  | { price: number | string; label?: string }
  | number
  | string;

// Expected format: { [symbol]: price | { price, label? } }
type OverrideMap = Record<string, OverrideEntry>;
const parsedOverrides = (() => {
  const raw = process.env.COINGECKO_PRICE_OVERRIDES;
  if (!raw) return {} as OverrideMap;
  try {
    const parsed = JSON.parse(raw) as OverrideMap;
    return parsed;
  } catch (error) {
    console.warn("Failed to parse COINGECKO_PRICE_OVERRIDES, ignoring", error);
    return {} as OverrideMap;
  }
})();

const getGasTokenOverrideKey = (chainId: number) => `gas-token:${chainId}`;
const getTokenOverrideKey = (chainId: number, address: string) =>
  `${chainId}:${address.toLowerCase()}`;

const normalizeIpfsGateway = (gateway?: string | null) => {
  if (!gateway || gateway.trim() === "") return "https://gateway.pinata.cloud";
  const trimmed = gateway.trim().replace(/\/$/, "");
  return trimmed.startsWith("http://") || trimmed.startsWith("https://") ?
      trimmed
    : `https://${trimmed}`;
};

const IPFS_GATEWAY = normalizeIpfsGateway(process.env.IPFS_GATEWAY);
const PINATA_JWT = process.env.PINATA_JWT;
const PINATA_KEY = process.env.PINATA_KEY;
const PINATA_SECRET = process.env.PINATA_SECRET;
const pinataClient =
  PINATA_JWT || (PINATA_KEY && PINATA_SECRET) ?
    (() => {
      try {
        return new pinataSDK({
          pinataJWTKey: PINATA_JWT,
          pinataApiKey: PINATA_KEY,
          pinataSecretApiKey: PINATA_SECRET,
        });
      } catch (error) {
        console.warn("[coingecko] failed to init pinata SDK", {
          authMode:
            PINATA_JWT ? "jwt"
            : PINATA_KEY && PINATA_SECRET ? "api_key_secret"
            : "none",
          error,
        });
        return null;
      }
    })()
  : null;
const CAN_WRITE_PINATA = Boolean(pinataClient);
let latestPriceCacheCid = process.env.COINGECKO_PRICE_CACHE_CID ?? null;
let priceCacheHydrated = false;
let priceCacheDirty = false;
const priceCache = new Map<string, PriceCacheEntry>();

const coercePrice = (entry: OverrideEntry | undefined | null) => {
  if (entry == null) return null;
  if (typeof entry === "number") return entry;
  if (typeof entry === "string") {
    const parsed = Number(entry);
    return Number.isFinite(parsed) ? parsed : null;
  }
  if ("price" in entry) {
    const parsed = Number((entry as any).price);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const getOverridePrice = (cacheKey: string, symbol?: string) => {
  const candidates = [
    cacheKey,
    cacheKey.toLowerCase(),
    symbol,
    symbol?.toUpperCase(),
  ].filter((candidate): candidate is string => Boolean(candidate));

  for (const candidate of candidates) {
    const price = coercePrice(parsedOverrides[candidate] as OverrideEntry);
    if (price != null) return price;
  }

  return null;
};

const getRequestHeaders = () => {
  const apiKey = process.env.COINGECKO_API_KEY;
  if (!apiKey) {
    throw new Error("COINGECKO_API_KEY is not set");
  }
  const headerKey =
    process.env.COINGECKO_USE_PRO?.toLowerCase() === "true" ?
      "x-cg-pro-api-key"
    : "x-cg-demo-api-key";

  return {
    accept: "application/json",
    [headerKey]: apiKey,
  };
};

const getIpfsGatewayUrl = (cid: string) => {
  const url = new URL(buildIpfsUrl(IPFS_GATEWAY, cid));
  if (PINATA_KEY) {
    url.searchParams.set("pinataGatewayToken", PINATA_KEY);
  }
  return url.toString();
};

const normalizeForPinata = <T>(payload: T): T => {
  try {
    return JSON.parse(
      JSON.stringify(payload, (_key, value) =>
        typeof value === "bigint" ? value.toString() : value,
      ),
    );
  } catch (error) {
    console.warn("[coingecko] normalizeForPinata failed", error);
    return payload;
  }
};

const fetchIpfsJson = async <T>(cid: string): Promise<T | null> => {
  if (!cid || !isValidCid(cid)) return null;
  try {
    const response = await fetch(getIpfsGatewayUrl(cid));
    if (!response.ok) {
      console.warn("[coingecko] IPFS fetch failed", {
        cid,
        status: response.status,
        statusText: response.statusText,
      });
      return null;
    }
    return (await response.json()) as T;
  } catch (error) {
    console.warn("[coingecko] IPFS fetch error", { cid, error });
    return null;
  }
};

const unpinPriceCacheCid = async (cid: string | null) => {
  if (!CAN_WRITE_PINATA || !cid) return;
  try {
    await pinataClient?.unpin(cid);
    console.log("[coingecko] unpinned previous price cache", { cid });
  } catch (error) {
    console.warn("[coingecko] pinata unpin error (prices)", { cid, error });
  }
};

const hydratePriceCacheFromPinata = async () => {
  if (priceCacheHydrated) return;
  priceCacheHydrated = true;

  const cid =
    latestPriceCacheCid ??
    (await (async () => {
      if (!CAN_WRITE_PINATA) return null;
      try {
        const data = await pinataClient?.pinList({
          status: "pinned",
          metadata: { name: COINGECKO_PRICE_CACHE_NAME, keyvalues: {} },
          pageLimit: 1,
          pageOffset: 0,
        } as any);
        const found = data?.rows?.[0]?.ipfs_pin_hash ?? null;
        if (found) {
          latestPriceCacheCid = found;
        }
        return found;
      } catch (error) {
        console.warn("[coingecko] pinata pinList error (price cache)", error);
        return null;
      }
    })());

  if (!cid) return;

  const remote = await fetchIpfsJson<{
    entries?: Record<string, PriceCacheEntry | null>;
  }>(cid);
  const entries =
    remote && typeof remote === "object" && "entries" in remote ?
      remote.entries
    : null;
  if (!entries || typeof entries !== "object") return;

  const now = Date.now();
  let hydrated = 0;

  for (const [key, entry] of Object.entries(entries)) {
    if (
      !entry ||
      typeof entry !== "object" ||
      typeof entry.value !== "number" ||
      typeof entry.expiresAt !== "number"
    ) {
      continue;
    }

    if (entry.expiresAt <= now) continue;
    priceCache.set(key, entry);
    hydrated++;
  }

  if (hydrated > 0) {
    console.log("[coingecko] hydrated price cache from IPFS", {
      cid,
      entries: hydrated,
    });
  }
};

const persistPriceCache = async (): Promise<string | null> => {
  if (!CAN_WRITE_PINATA || !priceCacheDirty || priceCache.size === 0) return null;

  const payload = {
    updatedAt: new Date().toISOString(),
    ttlMs: COINGECKO_PRICE_CACHE_TTL_MS,
    entries: Object.fromEntries(priceCache.entries()),
  };

  try {
    const previousCid = latestPriceCacheCid;
    await unpinPriceCacheCid(previousCid);
    const data = await pinataClient?.pinJSONToIPFS(normalizeForPinata(payload), {
      pinataMetadata: {
        name: COINGECKO_PRICE_CACHE_NAME,
        keyvalues: { updatedAt: payload.updatedAt },
      } as any,
      pinataOptions:
        PINATA_GROUP_ID ? ({ groupId: PINATA_GROUP_ID } as any) : undefined,
    });
    if (data?.IpfsHash) {
      latestPriceCacheCid = data.IpfsHash;
      priceCacheDirty = false;
      console.log("[coingecko] pinned price cache to IPFS", {
        cid: data.IpfsHash,
        entries: priceCache.size,
      });
      return data.IpfsHash;
    }
  } catch (error) {
    console.warn("[coingecko] pinata pinJSONToIPFS error (prices)", error);
  }

  return latestPriceCacheCid;
};

const getCachedPrice = (cacheKey: string) => {
  const cached = priceCache.get(cacheKey);
  if (!cached) return null;
  if (cached.expiresAt <= Date.now()) {
    priceCache.delete(cacheKey);
    return null;
  }
  return cached.value;
};

const setCachedPrice = ({
  cacheKey,
  value,
  symbol,
}: {
  cacheKey: string;
  value: number;
  symbol?: string;
}) => {
  priceCache.set(cacheKey, {
    value,
    symbol,
    expiresAt: Date.now() + COINGECKO_PRICE_CACHE_TTL_MS,
  });
  priceCacheDirty = true;
};

async function fetchTokenUsdPrice({
  chainId,
  address,
  symbol,
}: {
  chainId: number;
  address: string;
  symbol?: string;
}): Promise<number> {
  const override = getOverridePrice(getTokenOverrideKey(chainId, address), symbol);
  if (override != null) return override;

  const platform = PLATFORM_BY_CHAIN[chainId];
  if (!platform) {
    throw new Error(`Unsupported chainId for Coingecko price: ${chainId}`);
  }

  const primaryBase = getBaseUrl();
  const primaryUrl = new URL(COINGECKO_TOKEN_PRICE_URL(platform, primaryBase));
  primaryUrl.searchParams.set("contract_addresses", address.toLowerCase());
  primaryUrl.searchParams.set("vs_currencies", "usd");

  const request = async (targetUrl: URL) => {
    const res = await fetch(targetUrl, {
      headers: getRequestHeaders(),
      next: { revalidate: 0 },
    });
    return res;
  };

  let response = await request(primaryUrl);

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Failed to fetch Coingecko price (${response.status}): ${body}`,
    );
  }

  const data = (await response.json()) as Record<
    string,
    { usd?: number | null }
  >;

  const entry = data[address.toLowerCase()];
  if (entry?.usd == null) {
    const overridePrice = getOverridePrice(
      getTokenOverrideKey(chainId, address),
      symbol,
    );
    if (overridePrice != null) return overridePrice;
    throw new Error(
      `Coingecko price missing in response for ${address} on ${chainId}`,
    );
  }

  return entry.usd;
}

async function fetchGasTokenUsdPrice({
  chainId,
  symbol,
}: {
  chainId: number;
  symbol?: string;
}): Promise<number> {
  const override = getOverridePrice(getGasTokenOverrideKey(chainId), symbol);
  if (override != null) return override;

  const coinId = GAS_TOKEN_COIN_ID_BY_CHAIN[chainId];
  if (!coinId) {
    throw new Error(`Unsupported chainId for Coingecko gas token price: ${chainId}`);
  }

  const url = new URL(COINGECKO_COIN_PRICE_URL(getBaseUrl()));
  url.searchParams.set("ids", coinId);
  url.searchParams.set("vs_currencies", "usd");

  const response = await fetch(url, {
    headers: getRequestHeaders(),
    next: { revalidate: 0 },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Failed to fetch Coingecko gas token price (${response.status}): ${body}`,
    );
  }

  const data = (await response.json()) as Record<
    SupportedCoinId,
    { usd?: number | null } | undefined
  >;

  const entry = data[coinId];
  if (entry?.usd == null) {
    throw new Error(
      `Coingecko gas token price missing in response for ${coinId} on ${chainId}`,
    );
  }

  return entry.usd;
}

/**
 * Returns the USD price for a token address on a given chain using Coingecko.
 * Throws on any error or missing price.
 */
export async function getTokenUsdPrice(params: {
  chainId: number;
  address: string;
  symbol?: string;
}): Promise<number> {
  const cacheKey = getTokenOverrideKey(params.chainId, params.address);
  await hydratePriceCacheFromPinata();

  const cached = getCachedPrice(cacheKey);
  if (cached != null) return cached;

  const value = await fetchTokenUsdPrice(params);
  setCachedPrice({ cacheKey, value, symbol: params.symbol });
  await persistPriceCache();
  return value;
}

/**
 * Returns the USD price for a chain's native gas token using Coingecko.
 * Throws on any error or missing price.
 */
export async function getGasTokenUsdPrice(params: {
  chainId: number;
  symbol?: string;
}): Promise<number> {
  const cacheKey = getGasTokenOverrideKey(params.chainId);
  await hydratePriceCacheFromPinata();

  const cached = getCachedPrice(cacheKey);
  if (cached != null) return cached;

  const value = await fetchGasTokenUsdPrice(params);
  setCachedPrice({ cacheKey, value, symbol: params.symbol });
  await persistPriceCache();
  return value;
}
