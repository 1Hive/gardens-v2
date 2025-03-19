// api/passport/scores

import { NextResponse } from "next/server";

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

export async function GET() {
  try {
    const data = await fetchAllPassportScores();
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
