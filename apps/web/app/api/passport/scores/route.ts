// api/passport/scores

import { NextResponse } from "next/server";
import { fetchPassportScoreRecord } from "@/utils/gitcoin-passport";

export async function GET(request: Request) {
  const address = new URL(request.url).searchParams.get("address");
  if (address == null || !/^0x[a-fA-F0-9]{40}$/u.test(address)) {
    return NextResponse.json(
      { error: "A valid address is required." },
      { status: 400 },
    );
  }
  try {
    const data = await fetchPassportScoreRecord(address);
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
