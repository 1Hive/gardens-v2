import { NextResponse } from "next/server";

export function json(value, status = 200) {
  return NextResponse.json(value, {
    status,
    headers: { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" },
  });
}

export function sameOrigin(request) {
  const origin = request.headers.get("origin");
  return origin && origin === new URL(request.url).origin;
}

export async function readSmallJson(request) {
  if (!/^application\/json(?:;|$)/i.test(request.headers.get("content-type") || "")) {
    throw new Error("Expected JSON");
  }
  const body = await request.text();
  if (body.length > 1024) throw new Error("Request is too large");
  return JSON.parse(body);
}
