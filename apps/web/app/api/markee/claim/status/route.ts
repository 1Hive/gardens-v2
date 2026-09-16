import { NextRequest, NextResponse } from "next/server";
import { isHex } from "viem";
import { chainConfigMap } from "@/configs/chains";
import {
  getSquidClaimBridgeStatus,
  MarkeeClaimExecutionError,
} from "@/services/markeeServer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const jsonError = (error: string, status: number) =>
  NextResponse.json(
    { error },
    { headers: { "Cache-Control": "no-store" }, status },
  );

export async function GET(request: NextRequest) {
  const transactionHash = request.nextUrl.searchParams.get("transactionHash");
  const fromChainId = Number(request.nextUrl.searchParams.get("fromChainId"));
  const toChainId = Number(request.nextUrl.searchParams.get("toChainId"));

  if (
    transactionHash == null ||
    !isHex(transactionHash) ||
    transactionHash.length !== 66 ||
    !Number.isSafeInteger(fromChainId) ||
    !Number.isSafeInteger(toChainId) ||
    !Object.prototype.hasOwnProperty.call(chainConfigMap, fromChainId) ||
    !Object.prototype.hasOwnProperty.call(chainConfigMap, toChainId)
  ) {
    return jsonError("Invalid Markee bridge status request.", 400);
  }

  try {
    const status = await getSquidClaimBridgeStatus({
      fromChainId,
      toChainId,
      transactionHash,
    });
    return NextResponse.json(status, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("[Markee claim status] Status lookup failed", error);
    if (error instanceof MarkeeClaimExecutionError) {
      return jsonError(error.message, error.status);
    }
    return jsonError("Unable to retrieve the bridge status.", 502);
  }
}
