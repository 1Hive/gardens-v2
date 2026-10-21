import { beforeEach, expect, it, vi } from "vitest";
import { encodeAbiParameters, encodeEventTopics, keccak256 } from "viem";
const m = vi.hoisted(() => ({
  source: vi.fn(),
  destination: vi.fn(),
  read: vi.fn(),
}));
vi.mock("@/utils/publicClient", () => ({
  getEnvPublicClient: (chain: number) => ({
    getTransactionReceipt: chain === 8453 ? m.source : m.destination,
    getBlockNumber: async () => 101n,
    readContract: m.read,
  }),
}));
import {
  deliveryABI,
  erc20ABI,
  GNOSIS_WETH,
  relayAdapterABI,
} from "./markeeDelivery";
import { getMarkeeDeliveryStatus } from "./markeeDeliveryStatus";
const adapter = "0x1111111111111111111111111111111111111111";
const vault = "0x2222222222222222222222222222222222222222";
const community = "0x3333333333333333333333333333333333333333";
const hash = `0x${"11".repeat(32)}` as const;
const destinationHash = `0x${"22".repeat(32)}` as const;
const key = keccak256(
  encodeAbiParameters(
    [{ type: "uint256" }, { type: "address" }],
    [100n, community],
  ),
);
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("MARKEE_LIFI_DELIVERY_ADAPTER_BASE", adapter);
  m.source.mockResolvedValue({
    status: "success",
    blockNumber: 90n,
    logs: [
      {
        address: adapter,
        topics: encodeEventTopics({
          abi: relayAdapterABI,
          eventName: "RelayRouteStarted",
          args: { orderId: hash, communityKey: key, vault },
        }),
        data: encodeAbiParameters([{ type: "uint256" }], [10n]),
      },
    ],
  });
  m.destination.mockResolvedValue({
    status: "success",
    blockNumber: 95n,
    logs: [
      {
        address: GNOSIS_WETH,
        topics: encodeEventTopics({
          abi: erc20ABI,
          eventName: "Transfer",
          args: { from: adapter, to: vault },
        }),
        data: encodeAbiParameters([{ type: "uint256" }], [10n]),
      },
    ],
  });
  m.read
    .mockResolvedValueOnce(vault)
    .mockResolvedValueOnce(community)
    .mockResolvedValueOnce(GNOSIS_WETH);
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      Response.json({
        status: "DONE",
        substatus: "COMPLETED",
        sending: { txHash: hash },
        receiving: { chainId: 100, txHash: destinationHash },
      }),
    ),
  );
});
it("does not equate provider completion with Safe delivery", async () => {
  m.read
    .mockResolvedValueOnce(20n)
    .mockResolvedValueOnce(10n)
    .mockResolvedValueOnce(20n);
  expect((await getMarkeeDeliveryStatus(community, hash)).status).toBe(
    "awaiting_delivery",
  );
});
it("proves cumulative delivery at a confirmed block", async () => {
  m.read
    .mockResolvedValueOnce(20n)
    .mockResolvedValueOnce(10n)
    .mockResolvedValueOnce(30n);
  expect((await getMarkeeDeliveryStatus(community, hash)).status).toBe(
    "success",
  );
  expect(m.read).toHaveBeenLastCalledWith(
    expect.objectContaining({
      abi: deliveryABI,
      functionName: "totalDelivered",
      blockNumber: 100n,
    }),
  );
});
it("handles delivery in the arrival block", async () => {
  m.read
    .mockResolvedValueOnce(30n)
    .mockResolvedValueOnce(0n)
    .mockResolvedValueOnce(30n);
  expect((await getMarkeeDeliveryStatus(community, hash)).status).toBe(
    "success",
  );
});
it("rejects a receipt without vault funding", async () => {
  m.destination.mockResolvedValue({
    status: "success",
    blockNumber: 95n,
    logs: [],
  });
  await expect(getMarkeeDeliveryStatus(community, hash)).rejects.toThrow(
    "does not prove",
  );
});
it("does not claim success for unrelated source transactions", async () => {
  m.source.mockResolvedValue({ status: "success", blockNumber: 90n, logs: [] });
  expect((await getMarkeeDeliveryStatus(community, hash)).status).toBe(
    "unknown",
  );
  expect(fetch).not.toHaveBeenCalled();
});
it("waits for two source confirmations", async () => {
  m.source.mockResolvedValue({
    status: "success",
    blockNumber: 101n,
    logs: [],
  });
  expect((await getMarkeeDeliveryStatus(community, hash)).status).toBe(
    "ongoing",
  );
  expect(fetch).not.toHaveBeenCalled();
});
it("reports refunds without marking delivered", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        Response.json({ status: "DONE", substatus: "REFUNDED" }),
      ),
  );
  expect((await getMarkeeDeliveryStatus(community, hash)).status).toBe(
    "refund",
  );
  expect(m.destination).not.toHaveBeenCalled();
});

it("stops showing progress when the provider reports failure", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(Response.json({ status: "FAILED" })),
  );
  expect((await getMarkeeDeliveryStatus(community, hash)).status).toBe(
    "unknown",
  );
});
