import { NextRequest, NextResponse } from "next/server";
import { runMarkeeDeliveryKeeper } from "@/services/markeeDeliveryKeeper";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 240;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json(await runMarkeeDeliveryKeeper(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error(
      "[Markee delivery] Keeper failed",
      error instanceof Error ? error.message : "Unknown error",
    );
    return NextResponse.json(
      {
        error:
          "Community delivery needs attention. Funds remain in the destination vault if not yet delivered.",
      },
      { status: 503 },
    );
  }
}
