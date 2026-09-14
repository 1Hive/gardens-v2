import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const pinataMocks = vi.hoisted(() => ({
  pinList: vi.fn(),
  pinJSONToIPFS: vi.fn(),
  unpin: vi.fn(),
}));

vi.mock("@pinata/sdk", () => ({
  default: class MockPinataClient {
    pinList = pinataMocks.pinList;
    pinJSONToIPFS = pinataMocks.pinJSONToIPFS;
    unpin = pinataMocks.unpin;
  },
}));

vi.mock("@/utils/ipfs", () => ({
  buildIpfsUrl: (gateway: string, cid: string) => `${gateway}/ipfs/${cid}`,
  isValidCid: () => true,
}));

const CID_A = "QmP5Gpuke1GBHWrq4oZ5CkFgEPNbXUcCYjEtvZJcjwzvxd";
const CID_B = "Qme48KamKRdyGj5V2EdgdP5dEbY9T8UHfBLaH9P4q8rBYP";
const STALE_CID = "Qmbco3eSVvwgkD7jRmsMJ6LgWUYxJ8N4nXq19gzQx4D8gY";
const NEW_CID = "QmdgJ2QixG5cZKY1UbcstYAWrWxwunu3aKfwG2ESUuTGaA";

describe("CoinGecko Pinata price cache", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.stubEnv("PINATA_JWT", "test-jwt");
    vi.stubEnv("PINATA_KEY", "");
    vi.stubEnv("COINGECKO_PRICE_CACHE_CID", STALE_CID);
    pinataMocks.pinList.mockReset();
    pinataMocks.pinJSONToIPFS.mockReset();
    pinataMocks.unpin.mockReset().mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("merges every readable named cache when the configured CID is stale", async () => {
    const expiresAt = Date.now() + 60_000;
    pinataMocks.pinList.mockResolvedValue({
      rows: [{ ipfs_pin_hash: CID_A }, { ipfs_pin_hash: CID_B }],
    });
    pinataMocks.pinJSONToIPFS.mockResolvedValue({ IpfsHash: NEW_CID });
    vi.stubEnv(
      "COINGECKO_PRICE_OVERRIDES",
      JSON.stringify({ "gas-token:10": 2500 }),
    );
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL | Request) => {
        const url = String(input);
        if (url.includes(STALE_CID)) {
          return new Response(null, { status: 403 });
        }
        if (url.includes(CID_A)) {
          return Response.json({
            entries: {
              "137:0xtoken-a": { value: 1, symbol: "A", expiresAt },
            },
          });
        }
        if (url.includes(CID_B)) {
          return Response.json({
            entries: {
              "8453:0xtoken-b": { value: 2, symbol: "B", expiresAt },
            },
          });
        }
        throw new Error(`Unexpected fetch: ${url}`);
      }),
    );

    const { getGasTokenUsdPrice } = await import("./coingecko");
    await getGasTokenUsdPrice({ chainId: 10, symbol: "ETH" });

    const payload = pinataMocks.pinJSONToIPFS.mock.calls.at(-1)?.[0];
    expect(Object.keys(payload.entries).sort()).toEqual([
      "137:0xtoken-a",
      "8453:0xtoken-b",
      "gas-token:10",
    ]);
    expect(pinataMocks.unpin).toHaveBeenCalledWith(CID_A);
    expect(pinataMocks.unpin).toHaveBeenCalledWith(CID_B);
  });

  it("bounds concurrent IPFS reads while hydrating many cache snapshots", async () => {
    const cids = Array.from({ length: 40 }, (_, index) => `cache-cid-${index}`);
    let activeReads = 0;
    let maxActiveReads = 0;
    let releaseReads!: () => void;
    let markSaturated!: () => void;
    const readsBlocked = new Promise<void>((resolve) => {
      releaseReads = resolve;
    });
    const saturated = new Promise<void>((resolve) => {
      markSaturated = resolve;
    });

    vi.stubEnv("COINGECKO_PRICE_CACHE_CID", "");
    pinataMocks.pinList.mockResolvedValue({
      rows: cids.map((cid) => ({ ipfs_pin_hash: cid })),
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        activeReads += 1;
        maxActiveReads = Math.max(maxActiveReads, activeReads);
        if (activeReads === 16) markSaturated();
        await readsBlocked;
        activeReads -= 1;
        return Response.json({ entries: {} });
      }),
    );

    const { hydrateTokenPriceCache } = await import("./coingecko");
    const hydration = hydrateTokenPriceCache();
    await saturated;

    expect(fetch).toHaveBeenCalledTimes(16);
    expect(maxActiveReads).toBe(16);

    releaseReads();
    await hydration;
    expect(fetch).toHaveBeenCalledTimes(cids.length);
  });

  it("bounds concurrent Pinata cleanup after publishing a merged cache", async () => {
    const cids = Array.from({ length: 40 }, (_, index) => `cache-cid-${index}`);
    let activeUnpins = 0;
    let maxActiveUnpins = 0;
    let releaseUnpins!: () => void;
    let markSaturated!: () => void;
    const unpinsBlocked = new Promise<void>((resolve) => {
      releaseUnpins = resolve;
    });
    const saturated = new Promise<void>((resolve) => {
      markSaturated = resolve;
    });

    vi.stubEnv("COINGECKO_PRICE_CACHE_CID", "");
    vi.stubEnv(
      "COINGECKO_PRICE_OVERRIDES",
      JSON.stringify({ "gas-token:10": 2500 }),
    );
    pinataMocks.pinList.mockResolvedValue({
      rows: cids.map((cid) => ({ ipfs_pin_hash: cid })),
    });
    pinataMocks.pinJSONToIPFS.mockResolvedValue({ IpfsHash: NEW_CID });
    pinataMocks.unpin.mockImplementation(async () => {
      activeUnpins += 1;
      maxActiveUnpins = Math.max(maxActiveUnpins, activeUnpins);
      if (activeUnpins === 16) markSaturated();
      await unpinsBlocked;
      activeUnpins -= 1;
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ entries: {} })),
    );

    const { getGasTokenUsdPrice } = await import("./coingecko");
    const price = getGasTokenUsdPrice({ chainId: 10, symbol: "ETH" });
    await saturated;

    expect(pinataMocks.unpin).toHaveBeenCalledTimes(16);
    expect(maxActiveUnpins).toBe(16);

    releaseUnpins();
    await expect(price).resolves.toBe(2500);
    expect(pinataMocks.unpin).toHaveBeenCalledTimes(cids.length);
  });

  it("flushes entries added while another cache upload is in flight", async () => {
    let releaseFirstPin!: () => void;
    let markFirstPinStarted!: () => void;
    const firstPinStarted = new Promise<void>((resolve) => {
      markFirstPinStarted = resolve;
    });
    const firstPinBlocked = new Promise<void>((resolve) => {
      releaseFirstPin = resolve;
    });

    vi.stubEnv("COINGECKO_PRICE_CACHE_CID", "");
    vi.stubEnv(
      "COINGECKO_PRICE_OVERRIDES",
      JSON.stringify({ "gas-token:10": 2500, "gas-token:42220": 0.08 }),
    );
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 403 })),
    );
    pinataMocks.pinList.mockResolvedValue({ rows: [] });
    pinataMocks.pinJSONToIPFS
      .mockImplementationOnce(async () => {
        markFirstPinStarted();
        await firstPinBlocked;
        return { IpfsHash: CID_A };
      })
      .mockResolvedValueOnce({ IpfsHash: CID_B });

    const { getGasTokenUsdPrice } = await import("./coingecko");
    const optimismPrice = getGasTokenUsdPrice({ chainId: 10, symbol: "ETH" });
    await firstPinStarted;
    const celoPrice = getGasTokenUsdPrice({ chainId: 42220, symbol: "CELO" });
    releaseFirstPin();
    await Promise.all([optimismPrice, celoPrice]);

    expect(pinataMocks.pinJSONToIPFS).toHaveBeenCalledTimes(2);
    const finalPayload = pinataMocks.pinJSONToIPFS.mock.calls[1]?.[0];
    expect(finalPayload.entries).toMatchObject({
      "gas-token:10": expect.objectContaining({ value: 2500 }),
      "gas-token:42220": expect.objectContaining({ value: 0.08 }),
    });
  });
});
