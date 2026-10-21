import { beforeEach, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({
  adapter: vi.fn(),
  vault: vi.fn(),
  balance: vi.fn(),
  lease: vi.fn(),
  release: vi.fn(),
  renew: vi.fn(),
  write: vi.fn(),
  nonce: vi.fn(),
  simulate: vi.fn(),
  gas: vi.fn(),
  price: vi.fn(),
  native: vi.fn(),
  receipt: vi.fn(),
}));
vi.mock("./markeeDelivery", () => ({
  getDeliveryAdapter: m.adapter,
  getCommunityDeliveryVault: m.vault,
  deliveryBalance: m.balance,
  deliveryABI: [],
}));
vi.mock("@/utils/markeeChallengeStore", () => ({
  acquireMarkeeDeliveryLease: m.lease,
  releaseMarkeeDeliveryLease: m.release,
  renewMarkeeDeliveryLease: m.renew,
}));
vi.mock("@/utils/publicClient", () => ({
  getEnvPublicClient: () => ({
    getTransactionCount: m.nonce,
    simulateContract: m.simulate,
    estimateContractGas: m.gas,
    getGasPrice: m.price,
    getBalance: m.native,
    waitForTransactionReceipt: m.receipt,
  }),
  getRpcUrlForChain: () => "http://localhost",
  resolveClientChain: () => undefined,
}));
vi.mock("viem", async () => ({
  ...(await vi.importActual("viem")),
  createWalletClient: () => ({ writeContract: m.write }),
}));
import { runMarkeeDeliveryKeeper } from "./markeeDeliveryKeeper";
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("VERCEL_ENV", "production");
  vi.stubEnv(
    "MARKEE_GNOSIS_DELIVERY_COMMUNITIES",
    '["0x3333333333333333333333333333333333333333"]',
  );
  vi.stubEnv("MARKEE_DELIVERY_KEEPER_PK", `0x${"11".repeat(32)}`);
  m.adapter.mockReturnValue("0x1111111111111111111111111111111111111111");
  m.vault.mockResolvedValue("0x2222222222222222222222222222222222222222");
  m.lease.mockResolvedValue(true);
  m.renew.mockResolvedValue(true);
  m.balance.mockResolvedValue(100000000000000n);
  m.nonce.mockResolvedValue(1);
  m.simulate.mockResolvedValue({ request: {} });
  m.gas.mockResolvedValue(100000n);
  m.price.mockResolvedValue(1000000000n);
  m.native.mockResolvedValue(1000000000000000000n);
  m.write.mockResolvedValue(`0x${"22".repeat(32)}`);
  m.receipt.mockResolvedValue({ status: "success" });
});
it("does nothing while disabled", async () => {
  m.adapter.mockReturnValue(null);
  expect((await runMarkeeDeliveryKeeper()).status).toBe("disabled");
  expect(m.lease).not.toHaveBeenCalled();
});

it("never spends from a Vercel preview", async () => {
  vi.stubEnv("VERCEL_ENV", "preview");
  expect((await runMarkeeDeliveryKeeper()).status).toBe("disabled");
  expect(m.lease).not.toHaveBeenCalled();
});
it("does not race another serverless invocation", async () => {
  m.lease.mockResolvedValue(false);
  expect((await runMarkeeDeliveryKeeper()).status).toBe("busy");
  expect(m.write).not.toHaveBeenCalled();
});
it("does not submit while a transaction is pending", async () => {
  m.nonce.mockResolvedValueOnce(1).mockResolvedValueOnce(2);
  await expect(runMarkeeDeliveryKeeper()).rejects.toThrow("pending");
  expect(m.write).not.toHaveBeenCalled();
  expect(m.release).toHaveBeenCalled();
});
it("preserves the gas reserve", async () => {
  m.native.mockResolvedValue(0n);
  await expect(runMarkeeDeliveryKeeper()).rejects.toThrow("reserve");
  expect(m.write).not.toHaveBeenCalled();
});
it("submits once and waits for receipt", async () => {
  expect((await runMarkeeDeliveryKeeper()).deliveries[0].status).toBe(
    "delivered",
  );
  expect(m.write).toHaveBeenCalledTimes(1);
  expect(m.receipt).toHaveBeenCalledWith(
    expect.objectContaining({ confirmations: 2 }),
  );
});
it("never retries an ambiguous submission in the invocation", async () => {
  m.write.mockRejectedValue(new Error("timeout"));
  await expect(runMarkeeDeliveryKeeper()).rejects.toThrow("timeout");
  expect(m.write).toHaveBeenCalledTimes(1);
});
it("skips empty or dust vaults", async () => {
  m.balance.mockResolvedValue(0n);
  expect((await runMarkeeDeliveryKeeper()).deliveries[0].status).toBe(
    "below_threshold",
  );
  expect(m.write).not.toHaveBeenCalled();
});

it("does not submit after losing the distributed lease", async () => {
  m.renew.mockResolvedValue(false);
  await expect(runMarkeeDeliveryKeeper()).rejects.toThrow("lease expired");
  expect(m.write).not.toHaveBeenCalled();
});
