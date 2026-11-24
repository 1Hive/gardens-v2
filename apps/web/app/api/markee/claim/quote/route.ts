import { NextRequest, NextResponse } from "next/server";
import { isAddress } from "viem";
import { chainConfigMap } from "@/configs/chains";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const API = "https://www.markee.xyz/api/sdk/v1";
const headers = { "Cache-Control": "no-store" };

export async function GET(request: NextRequest) {
  const chainId = Number(request.nextUrl.searchParams.get("chainId"));
  const community = request.nextUrl.searchParams.get("community");
  if (
    !Number.isSafeInteger(chainId) ||
    !Object.prototype.hasOwnProperty.call(chainConfigMap, chainId) ||
    community == null ||
    !isAddress(community)
  ) {
    return NextResponse.json(
      { error: "Invalid Markee claim quote request." },
      { status: 400, headers },
    );
  }

  try {
    const params = new URLSearchParams({ chainId: String(chainId), community });
    const response = await fetch(`${API}/community/quote?${params}`, {
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(45_000),
    });
    const result: unknown = await response.json();
    if (typeof result !== "object" || result === null || Array.isArray(result))
      throw new Error("Invalid Markee quote response");
    return NextResponse.json(result, { status: response.status, headers });
  } catch {
    return NextResponse.json(
      { error: "Unable to reach Markee for the community revenue quote." },
      { status: 502, headers },
    );
  }
}
