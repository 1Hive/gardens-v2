type SupportedPlatform =
  | "ethereum"
  | "polygon-pos"
  | "celo"
  | "base"
  | "xdai"
  | "arbitrum-one"
  | "optimistic-ethereum";

type SupportedCoinId = "ethereum" | "matic-network" | "celo" | "xdai";

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

const getOverridePrice = (
  _chainId: number,
  _address: string,
  symbol?: string,
) => {
  if (!symbol) return null;
  return (
    coercePrice(parsedOverrides[symbol] as OverrideEntry) ??
    coercePrice(parsedOverrides[symbol.toUpperCase()] as OverrideEntry) ??
    null
  );
};

const getRequestHeaders = () => {
  if (!process.env.COINGECKO_API_KEY) {
    throw new Error("COINGECKO_API_KEY is not set");
  }

  const apiKey = process.env.COINGECKO_API_KEY;
  const headerKey =
    process.env.COINGECKO_USE_PRO?.toLowerCase() === "true" ?
      "x-cg-pro-api-key"
    : "x-cg-demo-api-key";

  return {
    accept: "application/json",
    ...(apiKey ? { [headerKey]: apiKey } : {}),
  };
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
  const override = getOverridePrice(chainId, address, symbol);
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
  if (!entry?.usd) {
    const overridePrice = getOverridePrice(chainId, address, symbol);
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
  const override = getOverridePrice(chainId, `native:${chainId}`, symbol);
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
  if (!entry?.usd) {
    throw new Error(
      `Coingecko gas token price missing in response for ${coinId} on ${chainId}`,
    );
  }

  return entry.usd;
}

const priceCache = new Map<string, { value: number; expiresAt: number }>();

const FIFTEEN_MIN_MS = 15 * 60 * 1000;

/**
 * Returns the USD price for a token address on a given chain using Coingecko.
 * Throws on any error or missing price.
 */
export async function getTokenUsdPrice(params: {
  chainId: number;
  address: string;
  symbol?: string;
}): Promise<number> {
  const cacheKey = `${params.chainId}:${params.address.toLowerCase()}`;
  const cached = priceCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const value = await fetchTokenUsdPrice(params);
  priceCache.set(cacheKey, { value, expiresAt: Date.now() + FIFTEEN_MIN_MS });
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
  const cacheKey = `native:${params.chainId}`;
  const cached = priceCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const value = await fetchGasTokenUsdPrice(params);
  priceCache.set(cacheKey, { value, expiresAt: Date.now() + FIFTEEN_MIN_MS });
  return value;
}
