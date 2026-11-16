import { NextRequest, NextResponse } from "next/server";
import { getAddress, isAddress } from "viem";
import { chainConfigMap } from "@/configs/chains";
import type { CommunityMarkeeResponse } from "@/services/markee";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MARKEE_SDK_SNAPSHOT_URL = "https://www.markee.xyz/api/sdk/v1/snapshot";

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

  try {
    const placement = {
      kind: "gardens-community",
      chainId,
      community: getAddress(community),
    };
    const url = new URL(MARKEE_SDK_SNAPSHOT_URL);
    url.searchParams.set("placement", JSON.stringify(placement));
    const response = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) {
      throw new Error(`Markee SDK snapshot returned HTTP ${response.status}`);
    }
    const snapshot = (await response.json()) as {
      community?: CommunityMarkeeResponse;
    };
    const result = snapshot.community;
    if (
      result?.integration == null ||
      result.leaderboard == null ||
      result.revenue == null
    ) {
      throw new Error("Markee SDK snapshot omitted community data");
    }

    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("[Markee community] Integration lookup failed", error);
    return jsonError("Unable to load the Markee community integration.", 502);
  }
}
