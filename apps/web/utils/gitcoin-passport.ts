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

export async function fetchPassportScore(account: string): Promise<number> {
  // Validate input to prevent SSRF (must be a proper Ethereum address)
  if (
    typeof account !== "string" ||
    !/^0x[a-fA-F0-9]{40}$/.test(account)
  ) {
    throw new Error("Invalid account address format");
  }
  const apiKey = process.env.GITCOIN_PASSPORT_API_KEY;
  const scorerId = process.env.SCORER_ID;
  const endpoint = `https://api.scorer.gitcoin.co/registry/score/${scorerId}/${account}`;

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
    const data = await response.json();
    return +data.score;
  } else {
    const errorData = await response.json();
    throw new Error(errorData.message || "Failed to fetch score from Gitcoin");
  }
}

export async function fetchAllPassportScores() {
  const apiKey = process.env.GITCOIN_PASSPORT_API_KEY;
  const scorerId = process.env.SCORER_ID;
  const endpoint = `https://api.scorer.gitcoin.co/registry/score/${scorerId}`;

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
