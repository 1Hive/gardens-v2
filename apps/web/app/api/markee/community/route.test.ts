import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getAddress } from "viem";

vi.mock("@/configs/chains", () => ({ chainConfigMap: { 100: {} } }));

import { GET } from "./route";

const community = "0xe2396fe2169ca026962971d3b2e373ba925b6257";
const url = `http://localhost/api/markee/community?chainId=100&community=${community}`;
const integration = {
  integration: {
    status: "active",
    leaderboardAddress: "0x5B9eF23a155Fd97d29fa463af824cFA53C4FAA11",
    vaultAddress: "0xb7Ea02d34772F9Eeb0A6e270b0D9eB6804b70eDC",
  },
  leaderboard: {
    maxMessageLength: "222",
    maxNameLength: "22",
    message: "gm",
    name: "Paul",
    minimumMonthlyRate: "999999997884000",
    topMarkeeAddress: "0xeD1641FeB37bc1819943a4564656c032838f7072",
    topMarkeeOwner: "0x809C9f8dd8CA93A41c3adca4972Fa234C28F7714",
    topRate: "380517503",
  },
  markeeChainId: 8453,
  preview: false,
  revenue: { claimableAmount: "513757523676319", symbol: "ETH" },
};

describe("GET /api/markee/community", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  it("returns the community data from the Markee SDK snapshot", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ community: integration }), { status: 200 }),
    );

    const response = await GET(new NextRequest(url));

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual(integration);
    expect(fetchMock).toHaveBeenCalledOnce();
    const [requestUrl, options] = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect(requestUrl.origin).toBe("https://www.markee.xyz");
    expect(requestUrl.pathname).toBe("/api/sdk/v1/snapshot");
    expect(JSON.parse(requestUrl.searchParams.get("placement") ?? "")).toEqual({
      kind: "gardens-community",
      chainId: 100,
      community: getAddress(community),
    });
    expect(options.cache).toBe("no-store");
  });

  it("rejects invalid communities before calling Markee", async () => {
    const response = await GET(
      new NextRequest(
        "http://localhost/api/markee/community?chainId=100&community=invalid",
      ),
    );

    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not present an incomplete snapshot as a valid integration", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ apiVersion: 1 }), { status: 200 }),
    );
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const response = await GET(new NextRequest(url));

    expect(response.status).toBe(502);
    consoleError.mockRestore();
  });
});
