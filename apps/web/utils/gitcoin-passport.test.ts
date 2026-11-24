import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  fetchPassportScore,
  fetchPassportScoreRecord,
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
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    fetchMock.mockReset();
  });

  it("fetches and parses a score from the Passport API", async () => {
    fetchMock.mockResolvedValue(
      Response.json({
        address: account,
        expiration_timestamp: "2099-01-01T00:00:00Z",
        last_score_timestamp: "2026-11-23T00:00:00Z",
        score: "21.75",
      }),
    );

    await expect(fetchPassportScore(account)).resolves.toBe(21.75);

    expect(fetchMock).toHaveBeenCalledWith(
      `https://api.passport.xyz/v2/stamps/${scorerId}/score/${account}`,
      {
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          "X-API-KEY": apiKey,
        },
        method: "GET",
      },
    );
  });

  it("returns zero when the Passport credential has expired", async () => {
    fetchMock.mockResolvedValue(
      Response.json({
        address: account,
        expiration_timestamp: "2020-01-01T00:00:00Z",
        last_score_timestamp: "2020-01-01T00:00:00Z",
        score: "21.75",
      }),
    );

    await expect(fetchPassportScore(account)).resolves.toBe(0);
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

  it("rejects a bulk or mismatched response instead of treating it as a score", async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ results: [] }));
    await expect(fetchPassportScoreRecord(account)).rejects.toThrow(
      "invalid score response",
    );
    fetchMock.mockResolvedValueOnce(
      Response.json({
        address: "0x0000000000000000000000000000000000000001",
        score: "20",
      }),
    );
    await expect(fetchPassportScoreRecord(account)).rejects.toThrow(
      "invalid score response",
    );
  });
});
