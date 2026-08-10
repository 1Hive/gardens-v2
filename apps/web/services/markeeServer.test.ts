import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  estimateContractGas: vi.fn(),
  getBalance: vi.fn(),
  getGasPrice: vi.fn(),
  getEnvPublicClient: vi.fn(),
  readContract: vi.fn(),
  simulateContract: vi.fn(),
}));

vi.mock("@/utils/publicClient", () => ({
  getEnvPublicClient: mocks.getEnvPublicClient,
}));

import { executeMarkeeClaim, markeeAdapter } from "./markeeServer";

const router = "0x0000000000000000000000000000000000000001";
const community = "0x0000000000000000000000000000000000000002";
const vault = "0x0000000000000000000000000000000000000003";
const recipient = "0x0000000000000000000000000000000000000004";
const factory = "0x0000000000000000000000000000000000000007";
const topMarkeeOwner = "0x0000000000000000000000000000000000000008";

describe("Markee community revenue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.MARKEE_KEEPER_ESTIMATION_ADDRESS_BASE;
    delete process.env.MARKEE_KEEPER_ESTIMATION_ADDRESS_SEPOLIA;
    process.env.NEXT_PUBLIC_ENV_GARDENS = "test";
    process.env.MARKEE_ROUTER_ADDRESS_SEPOLIA = router;
    process.env.MARKEE_STREAMING_LEADERBOARD_FACTORY_ADDRESS_SEPOLIA = factory;
    mocks.getEnvPublicClient.mockReturnValue({
      estimateContractGas: mocks.estimateContractGas,
      getBalance: mocks.getBalance,
      getGasPrice: mocks.getGasPrice,
      readContract: mocks.readContract,
      simulateContract: mocks.simulateContract,
    });
    process.env.KEEPER_WALLET_PK = `0x${"11".repeat(32)}`;
  });

  it("returns zero for a community without a registered vault", async () => {
    mocks.readContract.mockResolvedValue(
      "0x0000000000000000000000000000000000000000",
    );

    const result = await markeeAdapter.getCommunityIntegration(100, community);

    expect(result.revenue.claimableAmount).toBe("0");
    expect(result.integration.vaultAddress).toBeNull();
    expect(mocks.getEnvPublicClient).toHaveBeenCalledWith(11155111);
  });

  it("always uses Sepolia for a testnet community", async () => {
    process.env.NEXT_PUBLIC_ENV_GARDENS = "prod";
    mocks.readContract.mockResolvedValue(
      "0x0000000000000000000000000000000000000000",
    );

    const result = await markeeAdapter.getCommunityIntegration(
      11155111,
      community,
    );

    expect(result.markeeChainId).toBe(11155111);
    expect(mocks.getEnvPublicClient).toHaveBeenCalledWith(11155111);
  });

  it("uses the vault combined ETH balance as claimable revenue", async () => {
    mocks.readContract
      .mockResolvedValueOnce(vault)
      .mockResolvedValueOnce([
        1_000_000_000_000_000n,
        2_000_000_000_000_000n,
        3_000_000_000_000_000n,
        6_000_000_000_000_000n,
      ])
      .mockResolvedValueOnce(["0x0000000000000000000000000000000000000005"])
      .mockResolvedValueOnce(vault)
      .mockResolvedValueOnce(1_000_000_000_000_000n)
      .mockResolvedValueOnce(280n)
      .mockResolvedValueOnce(22n)
      .mockResolvedValueOnce("0x0000000000000000000000000000000000000006")
      .mockResolvedValueOnce(0n)
      .mockResolvedValueOnce("A live community message")
      .mockResolvedValueOnce("Gardener")
      .mockResolvedValueOnce(topMarkeeOwner);

    const result = await markeeAdapter.getCommunityIntegration(100, community);

    expect(result.revenue.claimableAmount).toBe("6000000000000000");
    expect(result.integration.vaultAddress).toBe(vault);
    expect(result.integration).toMatchObject({
      leaderboardAddress: "0x0000000000000000000000000000000000000005",
      status: "active",
    });
    expect(result.leaderboard).toMatchObject({
      maxMessageLength: "280",
      maxNameLength: "22",
      message: "A live community message",
      name: "Gardener",
      minimumMonthlyRate: "1000000000000000",
      topMarkeeAddress: "0x0000000000000000000000000000000000000006",
      topMarkeeOwner,
      topRate: "0",
    });
    expect(mocks.readContract).toHaveBeenNthCalledWith(
      10,
      expect.objectContaining({
        address: "0x0000000000000000000000000000000000000006",
        functionName: "message",
      }),
    );
    expect(mocks.readContract).toHaveBeenNthCalledWith(
      11,
      expect.objectContaining({
        address: "0x0000000000000000000000000000000000000006",
        functionName: "name",
      }),
    );
    expect(mocks.readContract).toHaveBeenCalledWith(
      expect.objectContaining({
        address: vault,
        functionName: "availableRevenue",
      }),
    );
  });

  it("uses the same live revenue amount in claim quotes", async () => {
    mocks.readContract
      .mockResolvedValueOnce(vault)
      .mockResolvedValueOnce([0n, 0n, 0n, 5_000_000_000_000_000n]);
    mocks.simulateContract.mockResolvedValue({ request: { test: true } });
    mocks.estimateContractGas.mockResolvedValue(100_000n);
    mocks.getGasPrice.mockResolvedValue(10_000_000_000n);

    const quote = await markeeAdapter.getClaimQuote(
      11155111,
      community,
      recipient,
    );

    expect(quote.bridged).toBe(false);
    expect(quote.claimAmount).toBe(5_000_000_000_000_000n);
    expect(quote.estimatedFeeAmount).toBe(0n);
    expect(quote.estimatedNetworkFeeAmount).toBe(1_250_000_000_000_000n);
    expect(quote.recipient).toBe(recipient);
  });

  it("refuses to broadcast when the configured keeper is not authorized", async () => {
    mocks.readContract
      .mockResolvedValueOnce(vault)
      .mockResolvedValueOnce([0n, 0n, 0n, 5_000_000_000_000_000n])
      .mockResolvedValueOnce(false);

    await expect(
      executeMarkeeClaim({
        chainId: 11155111,
        community,
        expectedClaimAmount: 5_000_000_000_000_000n,
        maxFeeAmount: 0n,
        recipient,
      }),
    ).rejects.toMatchObject({
      message: "The configured Markee keeper is not authorized by the router.",
      status: 503,
    });
    expect(mocks.simulateContract).not.toHaveBeenCalled();
  });

  it("refuses to broadcast when the keeper cannot cover buffered gas", async () => {
    mocks.readContract
      .mockResolvedValueOnce(vault)
      .mockResolvedValueOnce([0n, 0n, 0n, 5_000_000_000_000_000n])
      .mockResolvedValueOnce(true);
    mocks.simulateContract.mockResolvedValue({ request: { test: true } });
    mocks.estimateContractGas.mockResolvedValue(100_000n);
    mocks.getGasPrice.mockResolvedValue(10_000_000_000n);
    mocks.getBalance.mockResolvedValue(1n);

    await expect(
      executeMarkeeClaim({
        chainId: 11155111,
        community,
        expectedClaimAmount: 5_000_000_000_000_000n,
        maxFeeAmount: 0n,
        recipient,
      }),
    ).rejects.toMatchObject({
      message: "The Markee keeper needs more ETH to cover the transaction fee.",
      status: 503,
    });
    expect(mocks.getBalance).toHaveBeenCalled();
  });
});
