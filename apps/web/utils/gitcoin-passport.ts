export interface ApiScore {
  address: string;
  score: string;
  last_score_timestamp: string;
  expiration_timestamp?: string | null;
  expiration_date?: string | null;
  error: string | null;
}

export function getEffectivePassportScore(
  score: Pick<ApiScore, "score"> &
    Partial<Pick<ApiScore, "expiration_date" | "expiration_timestamp">>,
  nowMs = Date.now(),
): number {
  const parsedScore = Number(score.score);
  if (!Number.isFinite(parsedScore) || parsedScore < 0) {
    throw new Error("Passport API returned an invalid score");
  }

  const expiration = score.expiration_timestamp ?? score.expiration_date;
  if (expiration != null) {
    const expiresAt = Date.parse(expiration);
    if (!Number.isFinite(expiresAt) || expiresAt <= nowMs) return 0;
  }

  return parsedScore;
}

export async function fetchPassportScoreRecord(
  account: string,
): Promise<ApiScore> {
  // Validate input to prevent SSRF (must be a proper Ethereum address)
  if (typeof account !== "string" || !/^0x[a-fA-F0-9]{40}$/.test(account)) {
    throw new Error("Invalid account address format");
  }
  const apiKey = process.env.GITCOIN_PASSPORT_API_KEY;
  const scorerId = process.env.SCORER_ID;
  if (!apiKey) {
    throw Error("API key is missing");
  }
  if (!scorerId || !/^\d+$/u.test(scorerId)) {
    throw Error("Passport scorer ID is missing or invalid");
  }
  const endpoint = `https://api.passport.xyz/v2/stamps/${scorerId}/score/${account}`;

  const response = await fetch(endpoint, {
    method: "GET",
    cache: "no-store",
    headers: {
      "X-API-KEY": apiKey,
      "Content-Type": "application/json",
    },
  });

  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      (
        typeof data === "object" &&
        data !== null &&
        "message" in data &&
        typeof data.message === "string"
      ) ?
        data.message
      : `Passport score request failed (${response.status}).`;
    throw new Error(message);
  }
  if (
    typeof data !== "object" ||
    data === null ||
    !("address" in data) ||
    typeof data.address !== "string" ||
    data.address.toLowerCase() !== account.toLowerCase() ||
    !("score" in data) ||
    (typeof data.score !== "string" && typeof data.score !== "number")
  ) {
    throw new Error("Passport API returned an invalid score response.");
  }
  return {
    address: data.address,
    score: String(data.score),
    last_score_timestamp:
      (
        "last_score_timestamp" in data &&
        typeof data.last_score_timestamp === "string"
      ) ?
        data.last_score_timestamp
      : "",
    expiration_timestamp:
      (
        "expiration_timestamp" in data &&
        typeof data.expiration_timestamp === "string"
      ) ?
        data.expiration_timestamp
      : null,
    error:
      "error" in data && typeof data.error === "string" ? data.error : null,
  };
}

export async function fetchPassportScore(account: string): Promise<number> {
  const score = await fetchPassportScoreRecord(account);
  if (score.error != null) {
    throw new Error("Passport API could not calculate this score.");
  }
  return getEffectivePassportScore(score);
}
