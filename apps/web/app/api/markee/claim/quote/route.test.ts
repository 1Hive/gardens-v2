import { NextRequest } from "next/server";
import { beforeEach, expect, it, vi } from "vitest";

vi.mock("@/configs/chains", () => ({ chainConfigMap: { 100: {} } }));
import { GET } from "./route";

const community = "0x0000000000000000000000000000000000000001";
const request = (address = community) =>
  new NextRequest(
    `https://app.gardens.fund/api/markee/claim/quote?chainId=100&community=${address}`,
  );

beforeEach(() => vi.restoreAllMocks());

it("forwards the current quote and does not cache it", async () => {
  const quote = {
    claimAmount: "1000",
    estimatedFeeAmount: "20",
    recipient: community,
  };
  const fetchMock = vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValue(Response.json(quote));
  const response = await GET(request());
  expect(response.status).toBe(200);
  expect(response.headers.get("Cache-Control")).toBe("no-store");
  expect(await response.json()).toEqual(quote);
  expect(fetchMock.mock.calls[0][0]).toBe(
    `https://www.markee.xyz/api/sdk/v1/community/quote?chainId=100&community=${community}`,
  );
});

it("passes through Markee route errors", async () => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    Response.json({ error: "No delivery route" }, { status: 409 }),
  );
  const response = await GET(request());
  expect(response.status).toBe(409);
  expect(await response.json()).toEqual({ error: "No delivery route" });
});

it("rejects invalid requests before calling Markee", async () => {
  const fetchMock = vi.spyOn(globalThis, "fetch");
  expect((await GET(request("bad"))).status).toBe(400);
  expect(fetchMock).not.toHaveBeenCalled();
});
