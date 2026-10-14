import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  fetchAllPassportScores,
  fetchPassportScore,
  type ApiScore,
} from "./gitcoin-passport";

const account = "0x1234567890abcdef1234567890abcdef12345678";
const apiKey = "passport-test-key";
const scorerId = "42";

describe("Gitcoin Passport scorer client", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.stubEnv("GITCOIN_PASSPORT_API_KEY", apiKey);
    vi.stubEnv("SCORER_ID", scorerId);
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "info").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    fetchMock.mockReset();
  });

  it("fetches and parses a score from the Passport API", async () => {
    fetchMock.mockResolvedValue(Response.json({ score: "21.75" }));

    await expect(fetchPassportScore(account)).resolves.toBe(21.75);

    expect(fetchMock).toHaveBeenCalledWith(
      `https://api.passport.xyz/registry/score/${scorerId}/${account}`,
      {
        headers: {
          "Content-Type": "application/json",
          "X-API-KEY": apiKey,
        },
        method: "GET",
      },
    );
  });

  it("rejects an invalid account before making a request", async () => {
    await expect(fetchPassportScore("not-an-address")).rejects.toThrow(
      "Invalid account address format",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("requires an API key before making a request", async () => {
    vi.stubEnv("GITCOIN_PASSPORT_API_KEY", "");

    await expect(fetchPassportScore(account)).rejects.toThrow(
      "API key is missing",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("surfaces the Passport API error message", async () => {
    fetchMock.mockResolvedValue(
      Response.json({ message: "Scorer not found" }, { status: 404 }),
    );

    await expect(fetchPassportScore(account)).rejects.toThrow(
      "Scorer not found",
    );
  });

  it("fetches every score for the configured scorer", async () => {
    const scores: ApiScore[] = [
      {
        address: account,
        error: null,
        evidence: null,
        expiration_date: null,
        last_score_timestamp: "2026-10-14T00:00:00Z",
        score: "21.75",
        stamp_scores: { Github: 5 },
        status: "DONE",
      },
    ];
    fetchMock.mockResolvedValue(Response.json(scores));

    await expect(fetchAllPassportScores()).resolves.toEqual(scores);
    expect(fetchMock).toHaveBeenCalledWith(
      `https://api.passport.xyz/registry/score/${scorerId}`,
      {
        headers: {
          "Content-Type": "application/json",
          "X-API-KEY": apiKey,
        },
        method: "GET",
      },
    );
  });
});
