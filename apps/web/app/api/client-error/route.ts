import { NextResponse } from "next/server";

import { logger } from "@/utils/serverLogger";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let payload: unknown;

  try {
    payload = await req.json();
  } catch (error) {
    console.error("[client-error] invalid request body", error);
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  await logger.error(payload, {
    source: "client-error-api",
  });

  return NextResponse.json({ ok: true });
}
