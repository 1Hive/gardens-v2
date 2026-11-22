import { NextResponse } from "next/server";
import { getAddress, isAddress, isHex } from "viem";
import {
  readLimitedJsonBody,
  RequestBodyTooLargeError,
} from "../../../../utils/readLimitedJsonBody";
import { chainConfigMap } from "@/configs/chains";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;
const API = "https://www.markee.xyz/api/sdk/v1";
const headers = { "Cache-Control": "no-store" };
const errorResponse = (error: string, status: number) =>
  NextResponse.json({ error }, { status, headers });
const isObject = (body: unknown): body is Record<string, unknown> =>
  typeof body === "object" && body !== null && !Array.isArray(body);
const supportedChain = (chainId: unknown): chainId is number =>
  typeof chainId === "number" &&
  Number.isSafeInteger(chainId) &&
  Object.prototype.hasOwnProperty.call(chainConfigMap, chainId);

async function upstream(url: string | URL, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(45_000),
  });
  const body: unknown = await response.json();
  if (!isObject(body)) throw new Error("Invalid Markee API response");
  return { response, body };
}

// Gardens is a gateway only. Nonces, signature checks, rate limits and keeper
// transactions belong to Markee; no Redis or keeper credentials are used here.
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await readLimitedJsonBody(request, 16 * 1024);
  } catch (error) {
    return errorResponse(
      error instanceof RequestBodyTooLargeError ?
        error.message
      : "Invalid JSON body.",
      error instanceof RequestBodyTooLargeError ? 413 : 400,
    );
  }
  if (!isObject(body))
    return errorResponse("Invalid Markee authorization request.", 400);
  const challenge = body.action === "challenge";
  const verify = body.action === "verify";
  if (
    challenge ?
      !supportedChain(body.chainId) ||
      typeof body.community !== "string" ||
      !isAddress(body.community) ||
      typeof body.account !== "string" ||
      !isAddress(body.account)
    : !verify ||
      typeof body.nonce !== "string" ||
      !/^[1-9][0-9]{0,77}$/u.test(body.nonce) ||
      typeof body.signature !== "string" ||
      !isHex(body.signature)
  ) {
    return errorResponse("Invalid Markee authorization request.", 400);
  }
  try {
    const { response, body: result } = await upstream(
      `${API}/community/activate`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Forwarded-For": request.headers.get("x-forwarded-for") ?? "",
        },
        body: JSON.stringify(
          challenge ?
            {
              action: "challenge",
              chainId: body.chainId,
              community: body.community,
              account: body.account,
            }
          : { action: "verify", nonce: body.nonce, signature: body.signature },
        ),
      },
    );
    if (!response.ok || challenge)
      return NextResponse.json(result, { status: response.status, headers });
    // Retain the original successful response fields for cached Gardens clients.
    // New clients also consume the durable operation, including pending hashes.
    if (
      typeof result.id !== "string" ||
      !/^[a-f0-9]{64}$/u.test(result.id) ||
      !["working", "submitted", "complete", "failed"].includes(
        String(result.status),
      )
    )
      throw new Error("Invalid Markee operation");
    return NextResponse.json(
      { ...(isObject(result.result) ? result.result : {}), operation: result },
      { headers },
    );
  } catch {
    // Never log signed authorizations, nor retry a verification POST here.
    return errorResponse(
      "Unable to reach Markee. Check the activation status before authorizing again.",
      502,
    );
  }
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  try {
    const operationId = params.get("operationId");
    if (operationId !== null) {
      if (!/^[a-f0-9]{64}$/u.test(operationId))
        return errorResponse("Invalid operation identifier.", 400);
      const { response, body } = await upstream(
        `${API}/operations/${operationId}`,
      );
      return NextResponse.json(body, { status: response.status, headers });
    }
    const account = params.get("account");
    if (!account || !isAddress(account))
      return errorResponse("Invalid eligibility account.", 400);
    const chainId = Number(params.get("chainId"));
    const community = params.get("community");
    if (!supportedChain(chainId) || !community || !isAddress(community))
      return errorResponse("Invalid community.", 400);
    const url = new URL(`${API}/snapshot`);
    url.searchParams.set(
      "placement",
      JSON.stringify({
        kind: "gardens-community",
        chainId,
        community: getAddress(community),
      }),
    );
    url.searchParams.set("account", getAddress(account));
    const { response, body } = await upstream(url);
    if (!response.ok)
      return NextResponse.json(body, { status: response.status, headers });
    const communityData = isObject(body.community) ? body.community : null;
    const permissions =
      isObject(communityData?.permissions) ? communityData?.permissions : null;
    // Keep the legacy eligibility field name; Markee is the authority.
    return NextResponse.json(
      { isKeeper: permissions?.canActivate === true },
      { headers },
    );
  } catch {
    return errorResponse("Unable to load Markee activation status.", 502);
  }
}
