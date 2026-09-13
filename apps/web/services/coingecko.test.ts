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
