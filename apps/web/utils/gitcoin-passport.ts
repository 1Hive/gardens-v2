export interface ApiScore {
  address: string;
  score: string;
  status: string;
  last_score_timestamp: string;
  expiration_date: string | null;
  evidence: string | null;
  error: string | null;
  stamp_scores: Record<string, number>;
}

export function getEffectivePassportScore(
  score: Pick<ApiScore, "expiration_date" | "score">,
  nowMs = Date.now(),
): number {
  const parsedScore = Number(score.score);
  if (!Number.isFinite(parsedScore) || parsedScore < 0) {
    throw new Error("Passport API returned an invalid score");
  }

  if (score.expiration_date != null) {
    const expiresAt = Date.parse(score.expiration_date);
    if (!Number.isFinite(expiresAt) || expiresAt <= nowMs) return 0;
  }

  return parsedScore;
}

export async function fetchPassportScore(account: string): Promise<number> {
  // Validate input to prevent SSRF (must be a proper Ethereum address)
  if (typeof account !== "string" || !/^0x[a-fA-F0-9]{40}$/.test(account)) {
    throw new Error("Invalid account address format");
  }
  const apiKey = process.env.GITCOIN_PASSPORT_API_KEY;
  const scorerId = process.env.SCORER_ID;
  const endpoint = `https://api.passport.xyz/registry/score/${scorerId}/${account}`;

  if (!apiKey) {
    throw Error("API key is missing");
  }

  console.info("Making request to endpoint:", endpoint);

  const response = await fetch(endpoint, {
    method: "GET",
    headers: {
      "X-API-KEY": apiKey,
      "Content-Type": "application/json",
    },
  });

  console.info("Response status:", response.status);
  console.info("Response status text:", response.statusText);

  if (response.ok) {
    const data = (await response.json()) as Pick<
      ApiScore,
      "expiration_date" | "score"
    >;
    return getEffectivePassportScore(data);
  } else {
    const errorData = await response.json();
    throw new Error(errorData.message || "Failed to fetch score from Gitcoin");
  }
}

export async function fetchAllPassportScores() {
  const apiKey = process.env.GITCOIN_PASSPORT_API_KEY;
  const scorerId = process.env.SCORER_ID;
  const endpoint = `https://api.passport.xyz/registry/score/${scorerId}`;

  if (!apiKey) {
    throw Error("API key is missing");
  }

  const response = await fetch(endpoint, {
    method: "GET",
    headers: {
      "X-API-KEY": apiKey,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error((await response.json()) || "Failed to fetch scores");
  }

  return response.json() as Promise<ApiScore[]>;
}
