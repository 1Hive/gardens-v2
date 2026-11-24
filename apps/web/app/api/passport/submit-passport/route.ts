import { NextResponse } from "next/server";
import {
  fetchPassportScoreRecord,
  getEffectivePassportScore,
} from "../../../../utils/gitcoin-passport";

// Keep the existing Gardens POST contract for its callers. Passport v2
// calculates the latest score through GET, without a separate submission.
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const address =
    typeof body === "object" && body !== null && "address" in body ?
      body.address
    : undefined;
  if (typeof address !== "string" || !/^0x[a-fA-F0-9]{40}$/u.test(address))
    return NextResponse.json(
      { error: "A valid address is required" },
      { status: 400 },
    );

  try {
    const score = await fetchPassportScoreRecord(address);
    if (score.error != null) throw new Error(score.error);
    return NextResponse.json(
      { ...score, score: String(getEffectivePassportScore(score)) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Unable to retrieve Passport score", error);
    return NextResponse.json(
      { error: "Unable to retrieve Passport score" },
      { status: 502 },
    );
  }
}
