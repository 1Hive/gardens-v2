import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSquidClaimBridgeStatus: vi.fn(),
}));

vi.mock("@/configs/chains", () => ({
  chainConfigMap: { 10: {}, 8453: {} },
}));

vi.mock("@/services/markeeServer", () => ({
  getSquidClaimBridgeStatus: mocks.getSquidClaimBridgeStatus,
  MarkeeClaimExecutionError: class MarkeeClaimExecutionError extends Error {
    constructor(
      message: string,
      readonly status: number,
    ) {
      super(message);
    }
  },
}));

import { GET } from "./route";

const transactionHash = `0x${"12".repeat(32)}`;

describe("GET /api/markee/claim/status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSquidClaimBridgeStatus.mockResolvedValue({
      axelarTransactionUrl: `https://axelarscan.io/gmp/${transactionHash}`,
      destinationTransactionUrl: `https://optimistic.etherscan.io/tx/0x${"34".repeat(32)}`,
      elapsedTimeSeconds: 133,
      sourceTransactionUrl: `https://basescan.org/tx/${transactionHash}`,
      status: "success",
    });
  });

  it("returns normalized Squid status without caching", async () => {
    const response = await GET(
      new NextRequest(
        `http://localhost/api/markee/claim/status?transactionHash=${transactionHash}&fromChainId=8453&toChainId=10`,
      ),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    await expect(response.json()).resolves.toMatchObject({
      elapsedTimeSeconds: 133,
      status: "success",
    });
    expect(mocks.getSquidClaimBridgeStatus).toHaveBeenCalledWith({
      fromChainId: 8453,
      toChainId: 10,
      transactionHash,
    });
  });

  it("rejects malformed transaction hashes", async () => {
    const response = await GET(
      new NextRequest(
        "http://localhost/api/markee/claim/status?transactionHash=0x1234&fromChainId=8453&toChainId=10",
      ),
    );

    expect(response.status).toBe(400);
    expect(mocks.getSquidClaimBridgeStatus).not.toHaveBeenCalled();
  });
});
