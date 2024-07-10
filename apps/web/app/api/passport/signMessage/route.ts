// app/api/passport/getSigningMessage/route.ts
import { NextResponse } from "next/server";

export async function GET() {
  const apiKey = process.env.GITCOIN_PASSPORT_API_KEY;
  const endpoint = "https://api.scorer.gitcoin.co/registry/signing-message";

  if (!apiKey) {
    return NextResponse.json({ error: "API key is missing" }, { status: 500 });
  }

  try {
    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    console.log("SignMessage response ", response);
    if (response.ok) {
      const data = await response.json();
      console.log("DATA ", data);
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
