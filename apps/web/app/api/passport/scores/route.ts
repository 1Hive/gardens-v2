// api/passport/scores

import { NextResponse } from "next/server";
import { fetchAllPassportScores } from "@/utils/gitcoin-passport";

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
