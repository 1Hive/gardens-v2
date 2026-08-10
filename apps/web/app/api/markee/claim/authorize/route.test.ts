import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  executeMarkeeClaim: vi.fn(),
  getClaimQuote: vi.fn(),
  getEnvPublicClient: vi.fn(),
  readContract: vi.fn(),
  verifyTypedData: vi.fn(),
}));

vi.mock("@/configs/chains", () => ({
  chainConfigMap: { 100: {} },
}));

vi.mock("@/src/generated", () => ({
  registryCommunityABI: [],
}));

vi.mock("@/services/markeeServer", () => {
  class MarkeeClaimExecutionError extends Error {
    constructor(
      message: string,
      readonly status: number,
    ) {
      super(message);
    }
  }

  return {
    executeMarkeeClaim: mocks.executeMarkeeClaim,
    getMarkeeChainId: () =>
      process.env.NEXT_PUBLIC_ENV_GARDENS === "prod" ? 8453 : 11155111,
    MarkeeClaimExecutionError,
    markeeAdapter: {
      getClaimQuote: mocks.getClaimQuote,
    },
  };
});

vi.mock("@/utils/publicClient", () => ({
  getEnvPublicClient: mocks.getEnvPublicClient,
}));

import { clearMarkeeClaimAuthorizationChallengesForTests, POST } from "./route";

const community = "0x0000000000000000000000000000000000000001";
const councilSafe = "0x0000000000000000000000000000000000000002";
const councilOwner = "0x0000000000000000000000000000000000000003";
const otherAccount = "0x0000000000000000000000000000000000000004";
const rotatedSafe = "0x0000000000000000000000000000000000000005";
const signature = `0x${"11".repeat(65)}`;

const callRoute = (body: Record<string, unknown>) =>
  POST(
    new Request("http://localhost/api/markee/claim/authorize", {
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    }),
  );

const issueChallenge = async (account = councilOwner) => {
  const response = await callRoute({
    account,
    action: "challenge",
    chainId: 100,
    community,
  });

  return { body: await response.json(), response };
};

describe("Markee manual claim authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearMarkeeClaimAuthorizationChallengesForTests();
    process.env.NEXT_PUBLIC_ENV_GARDENS = "test";
    mocks.readContract.mockImplementation(
      ({ functionName }: { functionName: string }) => {
        if (functionName === "councilSafe") return councilSafe;
        if (functionName === "isOwner") return true;
        throw new Error(`Unexpected read: ${functionName}`);
      },
    );
    mocks.verifyTypedData.mockResolvedValue(true);
    mocks.getClaimQuote.mockResolvedValue({
      bridged: true,
      claimAmount: BigInt("420000000000000000"),
      estimatedFeeAmount: BigInt("2000000000000000"),
      markeeChainId: 11155111,
      recipient: councilSafe,
    });
    mocks.executeMarkeeClaim.mockResolvedValue({
      bridged: true,
      claimAmount: BigInt("420000000000000000"),
      estimatedFeeAmount: BigInt("2000000000000000"),
      expectedAmountOut: BigInt("418000000000000000"),
      markeeChainId: 11155111,
      transactionHash: `0x${"22".repeat(32)}`,
    });
    mocks.getEnvPublicClient.mockReturnValue({
      readContract: mocks.readContract,
      verifyTypedData: mocks.verifyTypedData,
    });
  });

  it("issues a fee-bound EIP-712 challenge to a current Safe owner", async () => {
    const { body, response } = await issueChallenge();

    expect(response.status).toBe(201);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(body).toMatchObject({
      chainId: 100,
      claimant: councilOwner,
      community,
      councilSafe,
      typedData: {
        domain: {
          chainId: 100,
          name: "Gardens Markee Claim",
          verifyingContract: community,
          version: "1",
        },
        message: {
          claimAmount: "420000000000000000",
          claimant: councilOwner,
          councilSafe,
          communityChainId: "100",
          markeeChainId: "11155111",
          maxFeeAmount: "2000000000000000",
          recipient: councilSafe,
          registryCommunity: community,
        },
        primaryType: "ClaimAuthorization",
      },
    });
    expect(body.nonce).toMatch(/^[1-9][0-9]{0,77}$/u);
    expect(body.typedData.message.nonce).toBe(body.nonce);
    expect(mocks.readContract).toHaveBeenCalledWith(
      expect.objectContaining({
        address: councilSafe,
        args: [councilOwner],
        functionName: "isOwner",
      }),
    );
  });

  it("allows the council Safe itself without an owner lookup", async () => {
    const { response } = await issueChallenge(councilSafe);

    expect(response.status).toBe(201);
    expect(mocks.readContract).not.toHaveBeenCalledWith(
      expect.objectContaining({ functionName: "isOwner" }),
    );
  });

  it("rejects an account that is not a current Safe owner", async () => {
    mocks.readContract.mockImplementation(
      ({ functionName }: { functionName: string }) =>
        functionName === "councilSafe" ? councilSafe : false,
    );

    const { body, response } = await issueChallenge(otherAccount);

    expect(response.status).toBe(403);
    expect(body).toEqual({
      error:
        "Connect with the council Safe or one of its current owners to claim revenue.",
    });
    expect(mocks.verifyTypedData).not.toHaveBeenCalled();
  });

  it("accepts a valid claim signature from a current Safe owner", async () => {
    const { body: challenge } = await issueChallenge();
    const response = await callRoute({
      action: "verify",
      nonce: challenge.nonce,
      signature,
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      authorized: true,
      bridged: true,
      chainId: 100,
      claimAmount: "420000000000000000",
      claimant: councilOwner,
      community,
      councilSafe,
      estimatedFeeAmount: "2000000000000000",
      expectedAmountOut: "418000000000000000",
      markeeChainId: 11155111,
      recipient: councilSafe,
      transactionHash: `0x${"22".repeat(32)}`,
    });
    expect(mocks.verifyTypedData).toHaveBeenCalledWith(
      expect.objectContaining({
        address: councilOwner,
        message: expect.objectContaining({
          claimAmount: BigInt("420000000000000000"),
          claimant: councilOwner,
          maxFeeAmount: BigInt("2000000000000000"),
          recipient: councilSafe,
        }),
        primaryType: "ClaimAuthorization",
        signature,
      }),
    );
    expect(mocks.executeMarkeeClaim).toHaveBeenCalledWith({
      chainId: 100,
      community,
      expectedClaimAmount: BigInt("420000000000000000"),
      maxFeeAmount: BigInt("2000000000000000"),
      recipient: councilSafe,
    });
  });

  it("consumes the challenge before verification to reject replays", async () => {
    const { body: challenge } = await issueChallenge();
    const request = {
      action: "verify",
      nonce: challenge.nonce,
      signature,
    };

    expect((await callRoute(request)).status).toBe(200);
    const replay = await callRoute(request);

    expect(replay.status).toBe(401);
    await expect(replay.json()).resolves.toEqual({
      error: "Claim authorization challenge is invalid or already used.",
    });
  });

  it("rejects a claim after the community rotates its council Safe", async () => {
    const { body: challenge } = await issueChallenge();
    mocks.readContract.mockImplementation(
      ({ functionName }: { functionName: string }) =>
        functionName === "councilSafe" ? rotatedSafe : true,
    );

    const response = await callRoute({
      action: "verify",
      nonce: challenge.nonce,
      signature,
    });

    expect(response.status).toBe(409);
    expect(mocks.verifyTypedData).not.toHaveBeenCalled();
  });

  it("rejects a signer whose Safe ownership was revoked", async () => {
    const { body: challenge } = await issueChallenge();
    mocks.readContract.mockImplementation(
      ({ functionName }: { functionName: string }) =>
        functionName === "councilSafe" ? councilSafe : false,
    );

    const response = await callRoute({
      action: "verify",
      nonce: challenge.nonce,
      signature,
    });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "The claim signer is no longer a council Safe owner.",
    });
    expect(mocks.verifyTypedData).not.toHaveBeenCalled();
  });

  it("rejects an invalid claim signature", async () => {
    mocks.verifyTypedData.mockResolvedValue(false);
    const { body: challenge } = await issueChallenge();

    const response = await callRoute({
      action: "verify",
      nonce: challenge.nonce,
      signature,
    });

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "Invalid claim authorization signature.",
    });
  });

  it("binds production claims to Base", async () => {
    process.env.NEXT_PUBLIC_ENV_GARDENS = "prod";
    const { body, response } = await issueChallenge();

    expect(response.status).toBe(201);
    expect(body.typedData.message.markeeChainId).toBe("8453");
  });
});
