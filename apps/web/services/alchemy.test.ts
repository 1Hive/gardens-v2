import { afterEach, describe, expect, it, vi } from "vitest";
import type { Address } from "viem";

vi.mock("@/globals", () => ({
  NFTs: {
    Protopian: [
      "0xCCac0bc52BF35d8F72d8dBEb780EEB9A4C1C5433",
      (tokenId: string) => tokenId === "200",
    ],
    Keeper: [
      "0xCCac0bc52BF35d8F72d8dBEb780EEB9A4C1C5433",
      (tokenId: string) => tokenId.startsWith("1"),
    ],
  },
}));

import { getNFTsForWallet, getNftHolderFlagsForWallet } from "./alchemy";

const owner = "0x0000000000000000000000000000000000000001" as Address;
const base = "https://alchemy.test/nft/v3/test-key";
const collection = "0xCCac0bc52BF35d8F72d8dBEb780EEB9A4C1C5433";

afterEach(() => vi.unstubAllGlobals());

describe("Alchemy wallet NFT reads", () => {
  it("filters by collection and follows owner pagination", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            ownedNfts: [{ tokenId: "100", contract: { address: collection } }],
            pageKey: "next-page",
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            ownedNfts: [{ tokenId: "101", contract: { address: collection } }],
          }),
          { status: 200 },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    const nfts = await getNFTsForWallet(owner, base, collection);

    expect(nfts.map((nft) => nft.tokenId)).toEqual(["100", "101"]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const first = new URL(fetchMock.mock.calls[0][0]);
    const second = new URL(fetchMock.mock.calls[1][0]);
    expect(first.searchParams.get("owner")).toBe(owner);
    expect(first.searchParams.get("contractAddresses[]")).toBe(collection);
    expect(first.searchParams.get("withMetadata")).toBe("false");
    expect(second.searchParams.get("pageKey")).toBe("next-page");
  });

  it("shares simultaneous badge checks and does not retry a 429", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response("Monthly capacity limit exceeded", { status: 429 }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const results = await Promise.allSettled([
      getNftHolderFlagsForWallet(owner, base),
      getNftHolderFlagsForWallet(owner, base),
    ]);

    expect(results.map((result) => result.status)).toEqual([
      "rejected",
      "rejected",
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
