import { NextResponse } from "next/server";
import { getSuperfluidStackClient } from "@/services/superfluid-stack";

export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const superfluidStackClient = getSuperfluidStackClient();
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get("limit");
    const offsetParam = searchParams.get("offset");

    const limit = limitParam ? Number(limitParam) : undefined;
    const offset = offsetParam ? Number(offsetParam) : undefined;

    const leaderboard = await superfluidStackClient.getLeaderboard(
      limit !== undefined || offset !== undefined
        ? { limit, offset }
        : undefined,
    );

    return NextResponse.json(leaderboard);
  } catch (error) {
    console.error("[stackso-leaderboard] failed to fetch leaderboard", error);
    return NextResponse.json(
      {
        error: "Failed to fetch Stackso leaderboard",
        message: (error as Error)?.message,
      },
      { status: 500 },
    );
  }
}
