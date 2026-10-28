import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("viem", () => ({
  createPublicClient: vi.fn(),
  createWalletClient: vi.fn(),
  custom: vi.fn(),
  http: vi.fn(),
}));
vi.mock("viem/accounts", () => ({ privateKeyToAccount: vi.fn() }));
vi.mock("@/configs/chains", () => ({ getConfigByChain: vi.fn() }));
vi.mock("@/providers/urql", () => ({ initUrqlClient: vi.fn() }));
vi.mock("@/src/generated", () => ({ passportScorerABI: [] }));
vi.mock("@/utils/gitcoin-passport", () => ({
  fetchAllPassportScores: vi.fn(),
  getEffectivePassportScore: (
    score: { expiration_date: string | null; score: string },
    nowMs: number,
  ) =>
    (
      score.expiration_date != null &&
      Date.parse(score.expiration_date) <= nowMs
    ) ?
      0
    : Number(score.score),
}));
vi.mock("@/utils/numbers", () => ({ CV_PASSPORT_THRESHOLD_SCALE: 100 }));
vi.mock("@/utils/web3", () => ({ getViemChain: vi.fn() }));

const userAddress = "0x0000000000000000000000000000000000000002";
const nowSeconds = 2_000_000;

const passportUser = (lastUpdated: number, score = "2000") => ({
  id: userAddress,
  userAddress,
  score,
  lastUpdated: String(lastUpdated),
});

const apiScore = (expirationDate: string | null = null) => ({
  address: userAddress,
  score: "20",
  status: "DONE",
  last_score_timestamp: new Date(nowSeconds * 1000).toISOString(),
  expiration_date: expirationDate,
  evidence: null,
  error: null,
  stamp_scores: {},
});

describe("Passport daily score comparison", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("refreshes an unchanged score before the contract TTL expires", async () => {
    const { compareScores } = await import("./route");

    const updates = compareScores(
      [passportUser(nowSeconds - 8 * 24 * 60 * 60)],
      [apiScore()],
      nowSeconds,
    );

    expect(updates).toEqual([
      expect.objectContaining({ userAddress, score: 20 }),
    ]);
  });

  it("does not spend keeper gas refreshing a recent unchanged score", async () => {
    const { compareScores } = await import("./route");

    const updates = compareScores(
      [passportUser(nowSeconds - 60)],
      [apiScore()],
      nowSeconds,
    );

    expect(updates).toEqual([]);
  });

  it("revokes a Passport score once the provider credential expires", async () => {
    const { compareScores } = await import("./route");

    const updates = compareScores(
      [passportUser(nowSeconds - 60)],
      [apiScore(new Date((nowSeconds - 1) * 1000).toISOString())],
      nowSeconds,
    );

    expect(updates).toEqual([
      expect.objectContaining({ userAddress, score: 0 }),
    ]);
  });

  it("paginates through every Passport user", async () => {
    const firstPage = Array.from({ length: 1000 }, (_, index) => ({
      ...passportUser(nowSeconds),
      id: `user-${index}`,
    }));
    const query = vi
      .fn()
      .mockReturnValueOnce({
        toPromise: vi.fn().mockResolvedValue({
          data: { passportUsers: firstPage },
        }),
      })
      .mockReturnValueOnce({
        toPromise: vi.fn().mockResolvedValue({
          data: { passportUsers: [passportUser(nowSeconds)] },
        }),
      });
    const { fetchPassportUsers } = await import("./route");

    const users = await fetchPassportUsers(
      { query } as never,
      "https://subgraph.example",
    );

    expect(users).toHaveLength(1001);
    expect(query).toHaveBeenNthCalledWith(
      2,
      expect.anything(),
      { first: 1000, skip: 1000 },
      expect.anything(),
    );
  });
});
