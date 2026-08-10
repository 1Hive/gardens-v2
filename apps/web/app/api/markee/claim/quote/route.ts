import { NextRequest, NextResponse } from "next/server";
import { getAddress, isAddress, zeroAddress } from "viem";
import { chainConfigMap } from "@/configs/chains";
import {
  MarkeeClaimExecutionError,
  markeeAdapter,
} from "@/services/markeeServer";
import { registryCommunityABI } from "@/src/generated";
import { getEnvPublicClient } from "@/utils/publicClient";

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
    return jsonError("Invalid Markee claim quote request.", 400);
  }

  try {
    const registryCommunity = getAddress(community);
    const client = getEnvPublicClient(chainId);
    const councilSafe = await client.readContract({
      abi: registryCommunityABI,
      address: registryCommunity,
      functionName: "councilSafe",
    });

    if (
      typeof councilSafe !== "string" ||
      !isAddress(councilSafe) ||
      getAddress(councilSafe) === zeroAddress
    ) {
      return jsonError("This community does not have a council Safe.", 409);
    }

    const quote = await markeeAdapter.getClaimQuote(
      chainId,
      registryCommunity,
      getAddress(councilSafe),
    );

    return NextResponse.json(
      {
        ...quote,
        claimAmount: quote.claimAmount.toString(),
        estimatedFeeAmount: quote.estimatedFeeAmount.toString(),
        estimatedNetworkFeeAmount: quote.estimatedNetworkFeeAmount.toString(),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("[Markee claim quote] Quote failed", error);
    if (error instanceof MarkeeClaimExecutionError) {
      return jsonError(error.message, error.status);
    }
    return jsonError("Unable to prepare the community revenue quote.", 502);
  }
}
