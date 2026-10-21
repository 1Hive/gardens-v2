import { beforeEach, describe, expect, it, vi } from "vitest";
import { zeroAddress } from "viem";
const mocks = vi.hoisted(() => ({ readContract: vi.fn() }));
vi.mock("@/utils/publicClient", () => ({ getEnvPublicClient: () => mocks }));
import {
  getCommunityDeliveryVault,
  getDeliveryAdapter,
  GNOSIS_WETH,
  requestRelayQuote,
} from "./markeeDelivery";
const adapter = "0x1111111111111111111111111111111111111111";
const vault = "0x2222222222222222222222222222222222222222";
const community = "0x3333333333333333333333333333333333333333";
const key = `0x${"11".repeat(32)}` as const;
function route() {
  return {
    tool: "relaydepository",
    action: {
      fromChainId: 8453,
      toChainId: 100,
      fromAddress: adapter,
      toAddress: vault,
      fromToken: { address: zeroAddress },
      toToken: { address: GNOSIS_WETH },
      fromAmount: "100000000000000",
    },
    estimate: { toAmountMin: "99000000000000" },
    transactionRequest: {
      chainId: 8453,
      from: adapter,
      to: "0x1231deb6f5749ef6ce6943a275a1d3e7486f4eae",
      value: "100000000000000",
      data: "0xa3443faa00",
    },
  };
}
beforeEach(() => {
  vi.resetAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
describe("community delivery configuration", () => {
  it("is disabled unless explicitly configured", () => {
    vi.stubEnv("MARKEE_LIFI_DELIVERY_ADAPTER_BASE", "");
    expect(getDeliveryAdapter()).toBeNull();
  });
  it("verifies both immutable community and token", async () => {
    mocks.readContract
      .mockResolvedValueOnce(vault)
      .mockResolvedValueOnce(community)
      .mockResolvedValueOnce(GNOSIS_WETH);
    expect(await getCommunityDeliveryVault(adapter, key, community)).toBe(
      vault,
    );
  });
  it("rejects another community vault", async () => {
    mocks.readContract
      .mockResolvedValueOnce(vault)
      .mockResolvedValueOnce(adapter)
      .mockResolvedValueOnce(GNOSIS_WETH);
    await expect(
      getCommunityDeliveryVault(adapter, key, community),
    ).rejects.toThrow("does not match");
  });
  it("rejects an unconfigured vault", async () => {
    mocks.readContract.mockResolvedValueOnce(zeroAddress);
    await expect(
      getCommunityDeliveryVault(adapter, key, community),
    ).rejects.toThrow("not configured");
  });
});
describe("Relay quote validation", () => {
  const request = () =>
    requestRelayQuote({ adapter, vault, amount: 100000000000000n });
  it("targets the vault, not the current Safe", async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json(route()));
    vi.stubGlobal("fetch", fetchMock);
    expect((await request()).quote?.expectedAmountOut).toBe(99000000000000n);
    const url = new URL(fetchMock.mock.calls[0][0]);
    expect(url.searchParams.get("toAddress")).toBe(vault);
    expect(url.searchParams.get("allowBridges")).toBe("relaydepository");
  });
  it.each(["receiver", "chain", "selector", "value", "token"])(
    "rejects a mismatched %s",
    async (field) => {
      const body = route();
      if (field === "receiver") body.action.toAddress = adapter;
      if (field === "chain") body.transactionRequest.chainId = 1;
      if (field === "selector") body.transactionRequest.data = "0x12345678";
      if (field === "value") body.transactionRequest.value = "2";
      if (field === "token") body.action.toToken.address = zeroAddress;
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(body)));
      await expect(request()).rejects.toThrow();
    },
  );
  it("preserves provider errors for classification", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(Response.json({ code: 1002 }, { status: 404 })),
    );
    expect((await request()).body.code).toBe(1002);
  });
});
