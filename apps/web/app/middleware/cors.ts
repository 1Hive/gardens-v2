import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const allowedOrigin = process.env.VERCEL_URL || request.headers.get("host");
  console.log({
    allowedOrigin,
    origin: request.headers.get("origin"),
  });
  if (allowedOrigin) {
    const origin = request.headers.get("origin");
    if (origin !== allowedOrigin) {
      return NextResponse.json(
        { error: "Forbidden: Invalid origin" },
        { status: 403 },
      );
    }
  }
  return NextResponse.next();
}
