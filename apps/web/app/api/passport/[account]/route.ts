// api/passport/[account]

import { NextResponse } from "next/server";
import { fetchPassportScore } from "@/utils/gitcoin-passport";

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
