import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getEnvPublicClient: vi.fn(),
  readContract: vi.fn(),
  simulateContract: vi.fn(),
  verifyTypedData: vi.fn(),
}));

vi.mock("viem/accounts", () => ({
  privateKeyToAccount: vi.fn(() => ({
    address: "0x0000000000000000000000000000000000000006",
  })),
}));

vi.mock("@/configs/chains", () => ({
  chainConfigMap: { 100: {} },
}));

vi.mock("@/src/generated", () => ({
  registryCommunityABI: [],
}));

vi.mock("@/utils/publicClient", () => ({
  getEnvPublicClient: mocks.getEnvPublicClient,
}));

import { clearMarkeeAuthorizationChallengesForTests, POST } from "./route";

const community = "0x0000000000000000000000000000000000000001";
const councilSafe = "0x0000000000000000000000000000000000000002";
const otherAccount = "0x0000000000000000000000000000000000000003";
const rotatedSafe = "0x0000000000000000000000000000000000000004";
const signature = `0x${"11".repeat(65)}`;
const leaderboardFactory = "0x37f420fdE5c98e611EB7cb9b74ef579D84697039";
const rotatedLeaderboardFactory = "0x0000000000000000000000000000000000000005";
const sepoliaRouter = "0x0000000000000000000000000000000000000007";
const baseRouter = "0x0000000000000000000000000000000000000008";
const keeper = "0x0000000000000000000000000000000000000006";
const keeperPrivateKey = `0x${"22".repeat(32)}`;
const vault = "0x0000000000000000000000000000000000000009";
const leaderboard = "0x0000000000000000000000000000000000000010";
const seedMarkee = "0x0000000000000000000000000000000000000011";

const callRoute = (body: Record<string, unknown>) =>
  POST(
    new Request("http://localhost/api/markee/authorize", {
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    }),
  );

const issueChallenge = async (account = councilSafe) => {
  const response = await callRoute({
    account,
    action: "challenge",
    chainId: 100,
    community,
  });

  return {
    body: await response.json(),
    response,
  };
};

describe("Markee council Safe authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearMarkeeAuthorizationChallengesForTests();
    mocks.readContract.mockResolvedValue(councilSafe);
    mocks.simulateContract.mockResolvedValue({
      result: [vault, leaderboard, seedMarkee],
    });
    mocks.verifyTypedData.mockResolvedValue(true);
    mocks.getEnvPublicClient.mockReturnValue({
      readContract: mocks.readContract,
      simulateContract: mocks.simulateContract,
      verifyTypedData: mocks.verifyTypedData,
    });
    process.env.NEXT_PUBLIC_ENV_GARDENS = "test";
    process.env.KEEPER_WALLET_PK = keeperPrivateKey;
    process.env.MARKEE_ROUTER_ADDRESS_SEPOLIA = sepoliaRouter;
    process.env.MARKEE_ROUTER_ADDRESS_BASE = baseRouter;
    process.env.MARKEE_STREAMING_LEADERBOARD_FACTORY_ADDRESS_SEPOLIA =
      leaderboardFactory;
    delete process.env.MARKEE_STREAMING_LEADERBOARD_FACTORY_ADDRESS;
    delete process.env.MARKEE_STREAMING_LEADERBOARD_FACTORY_ADDRESS_BASE;
  });

  it("issues an EIP-712 challenge bound to the current council Safe", async () => {
    const { body, response } = await issueChallenge();

    expect(response.status).toBe(201);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(body).toMatchObject({
      chainId: 100,
      community,
      councilSafe,
      leaderboardFactory,
      typedData: {
        domain: {
          chainId: 100,
          name: "Gardens Markee",
          verifyingContract: community,
          version: "1",
        },
        message: {
          communityChainId: "100",
          leaderboardFactory,
          registryCommunity: community,
        },
        primaryType: "OptInAuthorization",
      },
    });
    expect(body.nonce).toMatch(/^[1-9][0-9]{0,77}$/u);
    expect(body.typedData.message.nonce).toBe(body.nonce);
    expect(body.typedData.message.communityKey).toMatch(/^0x[0-9a-f]{64}$/u);
    expect(body.typedData.message.leaderboardMetadataHash).toMatch(
      /^0x[0-9a-f]{64}$/u,
    );
    expect(mocks.readContract).toHaveBeenCalledWith(
      expect.objectContaining({
        address: community,
        functionName: "councilSafe",
      }),
    );
  });

  it("asks a connected owner account to switch to the council Safe", async () => {
    const { body, response } = await issueChallenge(otherAccount);

    expect(response.status).toBe(403);
    expect(body).toEqual({
      error: "Connect with the community council Safe to authorize Markee.",
    });
    expect(mocks.verifyTypedData).not.toHaveBeenCalled();
  });

  it("accepts a threshold-valid Safe signature through ERC-1271", async () => {
    const { body: challenge } = await issueChallenge();
    const response = await callRoute({
      action: "verify",
      nonce: challenge.nonce,
      signature,
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      authorized: true,
      chainId: 100,
      community,
      councilSafe,
      leaderboardFactory,
      routerSimulation: {
        chainId: 11155111,
        from: keeper,
        result: [vault, leaderboard, seedMarkee],
        router: sepoliaRouter,
        simulated: true,
      },
    });
    expect(mocks.verifyTypedData).toHaveBeenCalledWith(
      expect.objectContaining({
        address: councilSafe,
        message: expect.objectContaining({
          nonce: BigInt(challenge.nonce),
          leaderboardFactory,
          registryCommunity: community,
        }),
        primaryType: "OptInAuthorization",
        signature,
      }),
    );
    expect(mocks.getEnvPublicClient).toHaveBeenCalledWith(11155111);
    expect(mocks.simulateContract).toHaveBeenCalledWith(
      expect.objectContaining({
        address: sepoliaRouter,
        args: [BigInt(100), community, "Gardens Community", "Gardens"],
        functionName: "createCommunityLeaderboard",
      }),
    );
  });

  it("simulates the router call on Base in Gardens production mode", async () => {
    process.env.NEXT_PUBLIC_ENV_GARDENS = "prod";
    process.env.MARKEE_STREAMING_LEADERBOARD_FACTORY_ADDRESS_BASE =
      leaderboardFactory;
    const { body: challenge } = await issueChallenge();

    const response = await callRoute({
      action: "verify",
      nonce: challenge.nonce,
      signature,
    });

    expect(response.status).toBe(200);
    expect(mocks.getEnvPublicClient).toHaveBeenCalledWith(8453);
    expect(mocks.simulateContract).toHaveBeenCalledWith(
      expect.objectContaining({ address: baseRouter }),
    );
  });

  it("consumes a challenge before verification to reject replays", async () => {
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
      error: "Authorization challenge is invalid or already used.",
    });
    expect(mocks.verifyTypedData).toHaveBeenCalledTimes(1);
  });

  it("rejects a challenge after the community rotates its council Safe", async () => {
    const { body: challenge } = await issueChallenge();
    mocks.readContract.mockResolvedValueOnce(rotatedSafe);

    const response = await callRoute({
      action: "verify",
      nonce: challenge.nonce,
      signature,
    });

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: "The community council Safe changed. Request a new challenge.",
    });
    expect(mocks.verifyTypedData).not.toHaveBeenCalled();
  });

  it("rejects an invalid Safe signature and consumes its challenge", async () => {
    mocks.verifyTypedData.mockResolvedValue(false);
    const { body: challenge } = await issueChallenge();

    const firstResponse = await callRoute({
      action: "verify",
      nonce: challenge.nonce,
      signature,
    });
    const replayResponse = await callRoute({
      action: "verify",
      nonce: challenge.nonce,
      signature,
    });

    expect(firstResponse.status).toBe(401);
    await expect(firstResponse.json()).resolves.toEqual({
      error: "Invalid council Safe authorization signature.",
    });
    expect(replayResponse.status).toBe(401);
  });

  it("rejects an expired challenge", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-06T12:00:00Z"));

    try {
      const { body: challenge } = await issueChallenge();
      vi.advanceTimersByTime(5 * 60 * 1000 + 1000);

      const response = await callRoute({
        action: "verify",
        nonce: challenge.nonce,
        signature,
      });

      expect(response.status).toBe(401);
      await expect(response.json()).resolves.toEqual({
        error: "Authorization challenge has expired.",
      });
      expect(mocks.verifyTypedData).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it("fails closed when the leaderboard factory is not configured", async () => {
    delete process.env.MARKEE_STREAMING_LEADERBOARD_FACTORY_ADDRESS_SEPOLIA;
    delete process.env.MARKEE_STREAMING_LEADERBOARD_FACTORY_ADDRESS;

    const { body, response } = await issueChallenge();

    expect(response.status).toBe(503);
    expect(body).toEqual({
      error: "Markee streaming leaderboard factory is not configured.",
    });
    expect(mocks.readContract).not.toHaveBeenCalled();
  });

  it("rejects a challenge after the configured factory changes", async () => {
    const { body: challenge } = await issueChallenge();
    process.env.MARKEE_STREAMING_LEADERBOARD_FACTORY_ADDRESS_SEPOLIA =
      rotatedLeaderboardFactory;

    const response = await callRoute({
      action: "verify",
      nonce: challenge.nonce,
      signature,
    });

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: "The Markee leaderboard factory changed. Request a new challenge.",
    });
    expect(mocks.verifyTypedData).not.toHaveBeenCalled();
  });
});
