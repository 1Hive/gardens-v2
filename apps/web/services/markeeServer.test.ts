import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

import {
  executeMarkeeClaim,
  getMarkeeClaimExecutionQuote,
  getSquidClaimBridgeStatus,
  markeeAdapter,
} from "./markeeServer";

const router = "0x0000000000000000000000000000000000000001";
const community = "0x0000000000000000000000000000000000000002";
const vault = "0x0000000000000000000000000000000000000003";
const recipient = "0x0000000000000000000000000000000000000004";
const factory = "0x0000000000000000000000000000000000000007";
const topMarkeeOwner = "0x0000000000000000000000000000000000000008";
const adapter = "0x0000000000000000000000000000000000000009";
const receiver = "0x0000000000000000000000000000000000000010";
const squidRouter = "0x0000000000000000000000000000000000000011";
const lifiDiamond = "0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE";

describe("Markee community revenue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.MARKEE_KEEPER_ESTIMATION_ADDRESS_BASE;
    delete process.env.MARKEE_KEEPER_ESTIMATION_ADDRESS_SEPOLIA;
    delete process.env.MARKEE_ROUTER_ADDRESS_BASE;
    delete process.env.SQUID_INTEGRATOR_ID;
    delete process.env.LIFI_GARDENS_API_KEY;
    delete process.env.LIFI_INTEGRATOR_ID;
    process.env.NEXT_PUBLIC_ENV_GARDENS = "test";
    process.env.MARKEE_ROUTER_ADDRESS_SEPOLIA = router;
    process.env.MARKEE_ROUTER_ADDRESS_BASE = router;
    process.env.MARKEE_STREAMING_LEADERBOARD_FACTORY_ADDRESS_SEPOLIA = factory;
    process.env.MARKEE_STREAMING_LEADERBOARD_FACTORY_ADDRESS_BASE = factory;
    mocks.getEnvPublicClient.mockReturnValue({
      estimateContractGas: mocks.estimateContractGas,
      getBalance: mocks.getBalance,
      getGasPrice: mocks.getGasPrice,
      readContract: mocks.readContract,
      simulateContract: mocks.simulateContract,
    });
    process.env.KEEPER_WALLET_PK = `0x${"11".repeat(32)}`;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("returns zero for a community without a registered vault", async () => {
    mocks.readContract.mockResolvedValue(
      "0x0000000000000000000000000000000000000000",
    );

    const result = await markeeAdapter.getCommunityIntegration(100, community);

    expect(result.revenue.claimableAmount).toBe("0");
    expect(result.integration.vaultAddress).toBeNull();
    expect(mocks.getEnvPublicClient).toHaveBeenCalledWith(8453);
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

  it("always uses Base for a production community", async () => {
    process.env.NEXT_PUBLIC_ENV_GARDENS = "test";
    mocks.readContract.mockResolvedValue(
      "0x0000000000000000000000000000000000000000",
    );

    const result = await markeeAdapter.getCommunityIntegration(
      42220,
      community,
    );

    expect(result.markeeChainId).toBe(8453);
    expect(mocks.getEnvPublicClient).toHaveBeenCalledWith(8453);
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

  it("builds a Squid production quote for a remote community", async () => {
    process.env.NEXT_PUBLIC_ENV_GARDENS = "prod";
    process.env.MARKEE_ROUTER_ADDRESS_BASE = router;
    process.env.SQUID_INTEGRATOR_ID = "gardens-test";
    mocks.readContract
      .mockResolvedValueOnce(vault)
      .mockResolvedValueOnce([0n, 0n, 0n, 1_000_000_000_000_000_000n])
      .mockResolvedValueOnce([adapter, 2])
      .mockResolvedValueOnce(receiver)
      .mockResolvedValueOnce(squidRouter);
    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => ({
        route: {
          estimate: {
            estimatedRouteDuration: 180,
            fromAmountUSD: "3000",
            toAmount: "990000000000000000",
            toAmountMin: "980000000000000000",
            toAmountUSD: "2970",
          },
          transactionRequest: {
            data: "0x12345678",
            target: squidRouter,
            value: "1000000000000000000",
          },
        },
      }),
      ok: true,
    });
    vi.stubGlobal("fetch", fetchMock);

    const quote = await getMarkeeClaimExecutionQuote(10, community, recipient);

    expect(quote).toMatchObject({
      bridgeProtocol: "squid",
      bridged: true,
      claimAmount: 1_000_000_000_000_000_000n,
      destinationSymbol: "ETH",
      estimatedFeeAmount: 10_000_000_000_000_000n,
      estimatedRouteDurationSeconds: 180,
      expectedAmountOut: 980_000_000_000_000_000n,
      markeeChainId: 8453,
      minAmountOut: 980_000_000_000_000_000n,
      recipient,
      router,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://v2.api.squidrouter.com/v2/route",
      expect.objectContaining({ method: "POST" }),
    );
    const request = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(request).toMatchObject({
      fromAddress: vault,
      fromChain: "8453",
      fromToken: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
      postHook: {
        calls: [
          expect.objectContaining({
            callType: 2,
            payload: {
              inputPos: 0,
              tokenAddress: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
            },
            target: receiver,
          }),
        ],
      },
      toChain: "10",
      toToken: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
    });
  });

  it("normalizes live Squid bridge status and timing", async () => {
    process.env.SQUID_INTEGRATOR_ID = "gardens-test";
    const transactionHash = `0x${"12".repeat(32)}` as const;
    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => ({
        axelarTransactionUrl: `https://axelarscan.io/gmp/${transactionHash}`,
        fromChain: {
          transactionUrl: `https://basescan.org/tx/${transactionHash}`,
        },
        squidTransactionStatus: "SUCCESS",
        timeSpent: { total: 133 },
        toChain: {
          transactionUrl: `https://optimistic.etherscan.io/tx/0x${"34".repeat(32)}`,
        },
      }),
      ok: true,
    });
    vi.stubGlobal("fetch", fetchMock);

    const status = await getSquidClaimBridgeStatus({
      fromChainId: 8453,
      toChainId: 10,
      transactionHash,
    });

    expect(status).toEqual({
      axelarTransactionUrl: `https://axelarscan.io/gmp/${transactionHash}`,
      destinationTransactionUrl: `https://optimistic.etherscan.io/tx/0x${"34".repeat(32)}`,
      elapsedTimeSeconds: 133,
      sourceTransactionUrl: `https://basescan.org/tx/${transactionHash}`,
      status: "success",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("https://v2.api.squidrouter.com/v2/status?"),
      expect.objectContaining({
        headers: { "x-integrator-id": "gardens-test" },
      }),
    );
  });

  it("uses the bridge protocol configured for the destination chain", async () => {
    process.env.NEXT_PUBLIC_ENV_GARDENS = "prod";
    process.env.MARKEE_ROUTER_ADDRESS_BASE = router;
    process.env.LIFI_GARDENS_API_KEY = "lifi-test-key";
    process.env.LIFI_INTEGRATOR_ID = "gardens";
    mocks.readContract
      .mockResolvedValueOnce(vault)
      .mockResolvedValueOnce([0n, 0n, 0n, 1_000_000_000_000_000_000n])
      .mockResolvedValueOnce([adapter, 3])
      .mockResolvedValueOnce(receiver);
    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => ({
        action: {
          fromAddress: adapter,
          fromAmount: "1000000000000000000",
          fromChainId: 8453,
          toAddress: recipient,
          toChainId: 100,
        },
        estimate: {
          fromAmount: "1000000000000000000",
          fromAmountUSD: "3000",
          toAmount: "2970000000000000000000",
          toAmountMin: "2940000000000000000000",
          toAmountUSD: "2940",
        },
        transactionRequest: {
          chainId: 8453,
          data: "0x12345678",
          from: adapter,
          to: lifiDiamond,
          value: "0xde0b6b3a7640000",
        },
      }),
      ok: true,
    });
    vi.stubGlobal("fetch", fetchMock);

    const quote = await getMarkeeClaimExecutionQuote(100, community, recipient);

    expect(quote).toMatchObject({
      bridgeProtocol: "lifi",
      bridged: true,
      claimAmount: 1_000_000_000_000_000_000n,
      destinationSymbol: "XDAI",
      estimatedFeeAmount: 20_000_000_000_000_000n,
      executionValue: 1_000_000_000_000_000_000n,
      expectedAmountOut: 2_940_000_000_000_000_000_000n,
      minAmountOut: 2_940_000_000_000_000_000_000n,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("https://li.quest/v1/quote?"),
      expect.objectContaining({
        cache: "no-store",
        headers: expect.objectContaining({
          "x-lifi-api-key": "lifi-test-key",
        }),
      }),
    );
    const requestUrl = new URL(fetchMock.mock.calls[0][0] as string);
    expect(Object.fromEntries(requestUrl.searchParams)).toMatchObject({
      fromAddress: adapter,
      fromAmount: "1000000000000000000",
      fromChain: "8453",
      fromToken: "0x0000000000000000000000000000000000000000",
      integrator: "gardens",
      toAddress: recipient,
      toChain: "100",
      toToken: "0x0000000000000000000000000000000000000000",
    });
  });

  it("falls back to WETH when native ETH routing is unavailable", async () => {
    process.env.NEXT_PUBLIC_ENV_GARDENS = "prod";
    process.env.MARKEE_ROUTER_ADDRESS_BASE = router;
    process.env.SQUID_INTEGRATOR_ID = "gardens-test";
    mocks.readContract
      .mockResolvedValueOnce(vault)
      .mockResolvedValueOnce([0n, 0n, 0n, 1_000_000_000_000_000_000n])
      .mockResolvedValueOnce([adapter, 2])
      .mockResolvedValueOnce(receiver)
      .mockResolvedValueOnce(squidRouter);
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        json: async () => ({ message: "Low liquidity" }),
        ok: false,
        status: 500,
      })
      .mockResolvedValueOnce({
        json: async () => ({
          route: {
            estimate: {
              fromAmountUSD: "3000",
              toAmount: "990000000000000000",
              toAmountMin: "980000000000000000",
              toAmountUSD: "2970",
            },
            transactionRequest: {
              data: "0x12345678",
              target: squidRouter,
              value: "1000000000000000000",
            },
          },
        }),
        ok: true,
      });
    vi.stubGlobal("fetch", fetchMock);

    const quote = await getMarkeeClaimExecutionQuote(10, community, recipient);

    expect(quote.destinationSymbol).toBe("ETH");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const nativeRequest = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    const wethRequest = JSON.parse(fetchMock.mock.calls[1][1].body as string);
    expect(nativeRequest.toToken).toBe(
      "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
    );
    expect(wethRequest).toMatchObject({
      postHook: {
        calls: [
          expect.objectContaining({
            callType: 1,
            payload: {
              inputPos: 1,
              tokenAddress: "0x4200000000000000000000000000000000000006",
            },
            target: "0x4200000000000000000000000000000000000006",
          }),
          expect.objectContaining({
            callType: 1,
            payload: {
              inputPos: 4,
              tokenAddress: "0x4200000000000000000000000000000000000006",
            },
            target: receiver,
          }),
        ],
      },
      toToken: "0x4200000000000000000000000000000000000006",
    });
  });

  it("falls back from Gnosis WETH to xDAI when WETH slippage is above 5%", async () => {
    process.env.NEXT_PUBLIC_ENV_GARDENS = "prod";
    process.env.MARKEE_ROUTER_ADDRESS_BASE = router;
    process.env.SQUID_INTEGRATOR_ID = "gardens-test";
    mocks.readContract
      .mockResolvedValueOnce(vault)
      .mockResolvedValueOnce([0n, 0n, 0n, 1_000_000_000_000_000_000n])
      .mockResolvedValueOnce([adapter, 2])
      .mockResolvedValueOnce(receiver)
      .mockResolvedValueOnce(squidRouter);
    const route = (aggregateSlippage: number) => ({
      json: async () => ({
        route: {
          estimate: {
            aggregateSlippage,
            fromAmountUSD: "3000",
            toAmount: "990000000000000000",
            toAmountMin: "980000000000000000",
            toAmountUSD: "2970",
          },
          transactionRequest: {
            data: "0x12345678",
            target: squidRouter,
            value: "1000000000000000000",
          },
        },
      }),
      ok: true,
    });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(route(6))
      .mockResolvedValueOnce(route(1));
    vi.stubGlobal("fetch", fetchMock);

    const quote = await getMarkeeClaimExecutionQuote(100, community, recipient);

    expect(quote.destinationSymbol).toBe("XDAI");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const wethRequest = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    const xdaiRequest = JSON.parse(fetchMock.mock.calls[1][1].body as string);
    expect(wethRequest.toToken).toBe(
      "0x6a023ccd1ff6f2045c3309768ead9e68f978f6e1",
    );
    expect(xdaiRequest).toMatchObject({
      postHook: {
        calls: [
          expect.objectContaining({
            callType: 2,
            payload: {
              inputPos: 0,
              tokenAddress: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
            },
            target: receiver,
          }),
        ],
      },
      toChain: "100",
      toToken: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
    });
  });

  it("routes production Celo claims to cETH through the token-aware receiver", async () => {
    process.env.NEXT_PUBLIC_ENV_GARDENS = "prod";
    process.env.MARKEE_ROUTER_ADDRESS_BASE = router;
    process.env.SQUID_INTEGRATOR_ID = "gardens-test";
    mocks.readContract
      .mockResolvedValueOnce(vault)
      .mockResolvedValueOnce([0n, 0n, 0n, 1_000_000_000_000_000_000n])
      .mockResolvedValueOnce([adapter, 2])
      .mockResolvedValueOnce(receiver)
      .mockResolvedValueOnce(squidRouter);
    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => ({
        route: {
          estimate: {
            fromAmountUSD: "3000",
            toAmount: "990000000000000000",
            toAmountMin: "980000000000000000",
            toAmountUSD: "2970",
          },
          transactionRequest: {
            data: "0x12345678",
            target: squidRouter,
            value: "1010000000000000000",
          },
        },
      }),
      ok: true,
    });
    vi.stubGlobal("fetch", fetchMock);

    const quote = await getMarkeeClaimExecutionQuote(
      42220,
      community,
      recipient,
    );

    expect(quote.destinationSymbol).toBe("ETH");
    expect(quote.executionValue).toBe(1_010_000_000_000_000_000n);
    expect(quote.estimatedFeeAmount).toBe(20_000_000_000_000_000n);
    const request = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(request).toMatchObject({
      fromChain: "8453",
      fromToken: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
      postHook: {
        calls: [
          expect.objectContaining({
            callType: 1,
            payload: {
              inputPos: 1,
              tokenAddress: "0x2def4285787d58a2f811af24755a8150622f4361",
            },
            target: "0x2def4285787d58a2f811af24755a8150622f4361",
          }),
          expect.objectContaining({
            callType: 1,
            payload: {
              inputPos: 4,
              tokenAddress: "0x2def4285787d58a2f811af24755a8150622f4361",
            },
            target: receiver,
          }),
        ],
      },
      toChain: "42220",
      toToken: "0x2def4285787d58a2f811af24755a8150622f4361",
    });
  });

  it("quotes tiny Squid claims when USD estimates round to zero", async () => {
    process.env.NEXT_PUBLIC_ENV_GARDENS = "prod";
    process.env.MARKEE_ROUTER_ADDRESS_BASE = router;
    process.env.SQUID_INTEGRATOR_ID = "gardens-test";
    const claimAmount = 7_000_000_000_000n;
    mocks.readContract
      .mockResolvedValueOnce(vault)
      .mockResolvedValueOnce([0n, 0n, 0n, claimAmount])
      .mockResolvedValueOnce([adapter, 2])
      .mockResolvedValueOnce(receiver)
      .mockResolvedValueOnce(squidRouter);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        json: async () => ({
          route: {
            estimate: {
              fromAmountUSD: "0.00",
              toAmount: "6500000000000",
              toAmountMin: "6000000000000",
              toAmountUSD: "0.00",
            },
            transactionRequest: {
              data: "0x12345678",
              target: squidRouter,
              value: "30000000000000",
            },
          },
        }),
        ok: true,
      }),
    );

    const quote = await getMarkeeClaimExecutionQuote(
      42220,
      community,
      recipient,
    );

    expect(quote.claimAmount).toBe(claimAmount);
    expect(quote.expectedAmountOut).toBe(6_000_000_000_000n);
    expect(quote.estimatedFeeAmount).toBe(24_000_000_000_000n);
  });

  it("logs Squid quote details but returns a user-friendly error", async () => {
    process.env.NEXT_PUBLIC_ENV_GARDENS = "prod";
    process.env.MARKEE_ROUTER_ADDRESS_BASE = router;
    process.env.SQUID_INTEGRATOR_ID = "gardens-test";
    mocks.readContract
      .mockResolvedValueOnce(vault)
      .mockResolvedValueOnce([0n, 0n, 0n, 1_000_000_000_000_000_000n])
      .mockResolvedValueOnce([adapter, 2])
      .mockResolvedValueOnce(receiver)
      .mockResolvedValueOnce(squidRouter);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        json: async () => ({
          message:
            "PostHook.calls[0].payload.tokenAddress: 0x is not a valid address",
          requestId: "squid-request-id",
        }),
        ok: false,
        status: 400,
      }),
    );
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    await expect(
      getMarkeeClaimExecutionQuote(42220, community, recipient),
    ).rejects.toMatchObject({
      message:
        "A bridge route is temporarily unavailable. Please try again shortly.",
      status: 502,
    });
    expect(consoleError).toHaveBeenCalledWith(
      "[Markee claim quote] Squid route request failed: PostHook.calls[0].payload.tokenAddress: 0x is not a valid address",
      expect.objectContaining({
        chainId: 42220,
        community,
        message:
          "PostHook.calls[0].payload.tokenAddress: 0x is not a valid address",
        requestId: "squid-request-id",
        status: 400,
      }),
    );
  });

  it("explains Squid liquidity failures without exposing provider internals", async () => {
    process.env.NEXT_PUBLIC_ENV_GARDENS = "prod";
    process.env.MARKEE_ROUTER_ADDRESS_BASE = router;
    process.env.SQUID_INTEGRATOR_ID = "gardens-test";
    mocks.readContract
      .mockResolvedValueOnce(vault)
      .mockResolvedValueOnce([0n, 0n, 0n, 1_000_000_000_000_000_000n])
      .mockResolvedValueOnce([adapter, 2])
      .mockResolvedValueOnce(receiver)
      .mockResolvedValueOnce(squidRouter);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        json: async () => ({
          message: "Low liquidity, please reduce swap amount and try again",
        }),
        ok: false,
        status: 500,
      }),
    );
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(
      getMarkeeClaimExecutionQuote(42220, community, recipient),
    ).rejects.toMatchObject({
      message:
        "No bridge route currently has enough liquidity for this claim. Please try again later.",
      status: 502,
    });
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

  it("allows same-chain revenue to increase after authorization", async () => {
    mocks.readContract
      .mockResolvedValueOnce(vault)
      .mockResolvedValueOnce([0n, 0n, 0n, 5_000_000_000_000_000n])
      .mockResolvedValueOnce(false);

    await expect(
      executeMarkeeClaim({
        chainId: 11155111,
        community,
        expectedClaimAmount: 4_000_000_000_000_000n,
        maxFeeAmount: 0n,
        recipient,
      }),
    ).rejects.toMatchObject({
      message: "The configured Markee keeper is not authorized by the router.",
      status: 503,
    });
  });

  it("rejects same-chain claims when revenue decreased after authorization", async () => {
    mocks.readContract
      .mockResolvedValueOnce(vault)
      .mockResolvedValueOnce([0n, 0n, 0n, 4_000_000_000_000_000n]);

    await expect(
      executeMarkeeClaim({
        chainId: 11155111,
        community,
        expectedClaimAmount: 5_000_000_000_000_000n,
        maxFeeAmount: 0n,
        recipient,
      }),
    ).rejects.toMatchObject({
      message:
        "The available community revenue changed. Request a new claim authorization.",
      status: 409,
    });
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
