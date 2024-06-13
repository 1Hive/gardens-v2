// app/api/passport/submit-passport/route.ts
import { NextResponse } from "next/server";

interface PassportData {
  address: string;
  signature: string;
  nonce: string;
}

export async function POST(request: Request) {
  console.log("Received POST request");
  const apiKey = process.env.GITCOIN_PASSPORT_API_KEY;
  const scorerId = process.env.SCORER_ID;
  const endpoint = "https://api.scorer.gitcoin.co/registry/submit-passport";

  if (!apiKey) {
    return NextResponse.json({ error: "API key is missing" }, { status: 500 });
  }

  let requestBody: PassportData;
  try {
    requestBody = await request.json();
    console.log("REQUEST BODY:", requestBody);
  } catch (error) {
    console.error("Error parsing JSON:", error);
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { address, signature, nonce } = requestBody;

  if (!address || !signature || !nonce) {
    return NextResponse.json(
      { error: "Address, signature, and nonce are required" },
      { status: 400 },
    );
  }

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": apiKey,
      },
      body: JSON.stringify({ address, scorer_id: scorerId, signature, nonce }),
    });

    console.log("SERVER RESPONSEEE ", response);

    if (response.ok) {
      const data = await response.json();
      return NextResponse.json(data, { status: 200 });
    } else {
      const errorData = await response.json();
      return NextResponse.json(
        { error: errorData.statusText },
        { status: response.status },
      );
    }
  } catch (error) {
    console.error("Request error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
