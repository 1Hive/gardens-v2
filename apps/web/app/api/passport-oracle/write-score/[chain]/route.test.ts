import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createPublicClient: vi.fn(),
  createWalletClient: vi.fn(),
  fetchPassportScore: vi.fn(),
  privateKeyToAccount: vi.fn(() => ({ address: "0xkeeper" })),
  query: vi.fn(),
  readContract: vi.fn(),
  waitForTransactionReceipt: vi.fn(),
  writeContract: vi.fn(),
}));

vi.mock("viem", () => ({
  createPublicClient: mocks.createPublicClient,
  createWalletClient: mocks.createWalletClient,
  custom: vi.fn(),
  http: vi.fn(),
}));

vi.mock("viem/accounts", () => ({
  privateKeyToAccount: mocks.privateKeyToAccount,
}));

vi.mock("#/subgraph/.graphclient", () => ({
  getMemberPassportAndCommunitiesDocument: {},
}));

vi.mock("@/configs/chains", () => ({
  getConfigByChain: vi.fn(() => ({
    passportScorer: "0x0000000000000000000000000000000000000001",
    publishedSubgraphUrl: "https://published.example",
    rpcUrl: "https://rpc.example",
    subgraphUrl: "https://development.example",
  })),
}));

vi.mock("@/configs/isProd", () => ({ isProd: true }));

vi.mock("@/providers/urql", () => ({
  initUrqlClient: vi.fn(() => ({
    urqlClient: { query: mocks.query },
  })),
}));

vi.mock("@/src/generated", () => ({ passportScorerABI: [] }));

vi.mock("@/utils/gitcoin-passport", () => ({
  fetchPassportScore: mocks.fetchPassportScore,
}));

vi.mock("@/utils/numbers", () => ({ CV_PASSPORT_THRESHOLD_SCALE: 100 }));
vi.mock("@/utils/web3", () => ({ getViemChain: vi.fn(() => ({})) }));

const user = "0x0000000000000000000000000000000000000002";

const callRoute = async () => {
  const { POST } = await import("./route");
  return POST(
    new Request("http://localhost/api/passport-oracle/write-score/10", {
      body: JSON.stringify({ user }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    }),
    { params: Promise.resolve({ chain: "10" }) },
  );
};

describe("Passport write-score keeper relay", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    process.env.LIST_MANAGER_PRIVATE_KEY = `0x${"1".repeat(64)}`;
    delete process.env.KEEPER_WALLET_PK;

    mocks.createPublicClient.mockReturnValue({
      readContract: mocks.readContract,
      transport: {},
      waitForTransactionReceipt: mocks.waitForTransactionReceipt,
    });
    mocks.createWalletClient.mockReturnValue({
      writeContract: mocks.writeContract,
    });
    mocks.fetchPassportScore.mockResolvedValue(20);
    mocks.query.mockReturnValue({
      toPromise: vi.fn().mockResolvedValue({
        data: {
          member: { memberCommunity: [{}] },
          passportUser: null,
        },
        error: null,
      }),
    });
  });

  it("returns success without using the keeper when the score is unchanged", async () => {
    mocks.readContract.mockResolvedValue(2_000n);

    const response = await callRoute();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      score: 2_000,
      unchanged: true,
    });
    expect(mocks.readContract).toHaveBeenCalledWith(
      expect.objectContaining({
        args: [user],
        functionName: "userScores",
      }),
    );
    expect(mocks.createWalletClient).not.toHaveBeenCalled();
    expect(mocks.writeContract).not.toHaveBeenCalled();
    expect(mocks.waitForTransactionReceipt).not.toHaveBeenCalled();
  });

  it("writes a changed score and waits until the no-op read can observe it", async () => {
    const hash = `0x${"2".repeat(64)}`;
    mocks.readContract.mockResolvedValue(1_500n);
    mocks.writeContract.mockResolvedValue(hash);

    const response = await callRoute();

    expect(response.status).toBe(200);
    expect(mocks.writeContract).toHaveBeenCalledWith(
      expect.objectContaining({
        args: [user, 2_000n],
        functionName: "addUserScore",
      }),
    );
    expect(mocks.waitForTransactionReceipt).toHaveBeenCalledWith({ hash });
  });
});
