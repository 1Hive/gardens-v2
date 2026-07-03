import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let payload: unknown;

  try {
    payload = await req.json();
  } catch (error) {
    console.error("[client-error] invalid request body", error);
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  console.error("[client-error]", payload);

  return NextResponse.json({ ok: true });
}
