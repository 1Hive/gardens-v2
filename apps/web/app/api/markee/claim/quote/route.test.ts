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
import { MarkeeClaimExecutionError } from "@/services/markeeServer";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.readContract.mockResolvedValue(
    "0x0000000000000000000000000000000000000001",
  );
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
