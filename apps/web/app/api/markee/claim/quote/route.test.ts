import { NextRequest } from "next/server";
import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getClaimQuote: vi.fn(),
  readContract: vi.fn(),
}));
vi.mock("@/configs/chains", () => ({ chainConfigMap: { 100: {} } }));
vi.mock("@/src/generated", () => ({ registryCommunityABI: [] }));
vi.mock("@/utils/publicClient", () => ({
  getEnvPublicClient: () => ({ readContract: mocks.readContract }),
}));
vi.mock("@/services/markeeServer", () => ({
  markeeAdapter: { getClaimQuote: mocks.getClaimQuote },
  MarkeeClaimExecutionError: class extends Error {
    constructor(
      message: string,
      readonly status: number,
      readonly code?: string,
      readonly retryable = false,
    ) {
      super(message);
    }
  },
}));
import { GET } from "./route";
import { clearMarkeeChallengesForTests } from "../../../../../utils/markeeChallengeStore";
import { consumeClaimQuoteSnapshot } from "../../../../../utils/markeeClaimQuoteSnapshot";
import { MarkeeClaimExecutionError } from "@/services/markeeServer";

beforeEach(() => {
  vi.clearAllMocks();
  clearMarkeeChallengesForTests();
  mocks.readContract.mockResolvedValue(
    "0x0000000000000000000000000000000000000001",
  );
});

it("returns durable reviewed terms instead of exposing a short executable-route expiry", async () => {
  const community = "0xe2396fe2169ca026962971d3b2e373ba925b6257";
  const recipient = "0x0000000000000000000000000000000000000001";
  mocks.getClaimQuote.mockResolvedValue({
    bridged: true,
    claimAmount: 100000n,
    estimatedFeeAmount: 1000n,
    estimatedNetworkFeeAmount: 200n,
    expectedAmountOut: 98800n,
    markeeChainId: 8453,
    recipient,
    expiresAt: Math.floor(Date.now() / 1000) + 60,
  });
  const response = await GET(
    new NextRequest(
      `https://app.gardens.fund/api/markee/claim/quote?chainId=100&community=${community}`,
    ),
  );
  const body = await response.json();
  expect(response.status).toBe(200);
  expect(body.quoteId).toMatch(/^[a-f0-9]{64}$/u);
  expect(body.maxFeeAmount).toBe("1050");
  expect(body.expiresAt).toBeGreaterThanOrEqual(
    Math.floor(Date.now() / 1000) + 299,
  );
  await expect(
    consumeClaimQuoteSnapshot(body.quoteId, 100, community, recipient, 8453),
  ).resolves.toMatchObject({ claimAmount: 100000n, maxFeeAmount: 1050n });
});

it("returns a non-retryable unavailable-route response without caching", async () => {
  mocks.getClaimQuote.mockRejectedValue(
    new MarkeeClaimExecutionError(
      "No delivery route",
      409,
      "BRIDGE_ROUTE_UNAVAILABLE",
      false,
    ),
  );
  const response = await GET(
    new NextRequest(
      "https://app.gardens.fund/api/markee/claim/quote?chainId=100&community=0xe2396fe2169ca026962971d3b2e373ba925b6257",
    ),
  );
  expect(response.status).toBe(409);
  expect(response.headers.get("Cache-Control")).toBe("no-store");
  await expect(response.json()).resolves.toMatchObject({
    error: "No delivery route",
    code: "BRIDGE_ROUTE_UNAVAILABLE",
    retryable: false,
  });
});

it("does not retry invalid input", async () => {
  const response = await GET(
    new NextRequest(
      "https://app.gardens.fund/api/markee/claim/quote?chainId=100&community=bad",
    ),
  );
  expect(response.status).toBe(400);
  await expect(response.json()).resolves.toMatchObject({ retryable: false });
  expect(mocks.getClaimQuote).not.toHaveBeenCalled();
});
