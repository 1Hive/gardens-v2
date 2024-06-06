// app/api/passport/[account]/route.ts
import { NextResponse } from "next/server";

interface Params {
  params: {
    account: string;
  };
}

export async function GET(request: Request, { params }: Params) {
  const { account } = params;

  if (!account) {
    return NextResponse.json(
      { error: "Account address is required" },
      { status: 400 },
    );
  }

  const apiKey = process.env.GITCOIN_PASSPORT_API_KEY;
  const scorerId = process.env.SCORER_ID;
  const endpoint = `https://api.scorer.gitcoin.co/registry/score/${scorerId}/${account}`;

  if (!apiKey) {
    return NextResponse.json({ error: "API key is missing" }, { status: 500 });
  }

  try {
    const response = await fetch(endpoint, {
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      const data = await response.json();
      return NextResponse.json(data, { status: 200 });
    } else {
      const errorData = await response.json();
      return NextResponse.json(
        { error: errorData.message },
        { status: response.status },
      );
    }
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
