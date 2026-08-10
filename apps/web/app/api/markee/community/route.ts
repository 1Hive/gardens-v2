import { NextRequest, NextResponse } from "next/server";
import { getAddress, isAddress } from "viem";
import { chainConfigMap } from "@/configs/chains";
import { markeeAdapter } from "@/services/markeeServer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const jsonError = (error: string, status: number) =>
  NextResponse.json(
    { error },
    { headers: { "Cache-Control": "no-store" }, status },
  );

export async function GET(request: NextRequest) {
  const chainId = Number(request.nextUrl.searchParams.get("chainId"));
  const community = request.nextUrl.searchParams.get("community");

  if (
    !Number.isSafeInteger(chainId) ||
    !Object.prototype.hasOwnProperty.call(chainConfigMap, chainId) ||
    community == null ||
    !isAddress(community)
  ) {
    return jsonError("Invalid Markee community request.", 400);
  }

  const result = await markeeAdapter.getCommunityIntegration(
    chainId,
    getAddress(community),
  );

  return NextResponse.json(result, {
    headers: { "Cache-Control": "no-store" },
  });
}
