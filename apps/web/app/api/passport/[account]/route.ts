// api/passport/[account]

import { NextResponse } from "next/server";

interface Params {
  params: {
    account: string;
  };
}

export async function fetchPassportScore(account: string): Promise<number> {
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

export async function GET(request: Request, { params }: Params) {
  const { account } = params;
  if (!account) {
    return NextResponse.json(
      { error: "Account address is required" },
      { status: 400 },
    );
  }
  try {
    const data = await fetchPassportScore(account);
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error("Request error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
