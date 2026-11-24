import { NextResponse } from "next/server";
import { isAddress, isHex } from "viem";
import {
  readLimitedJsonBody,
  RequestBodyTooLargeError,
} from "../../../../../utils/readLimitedJsonBody";
import { chainConfigMap } from "@/configs/chains";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const API = "https://www.markee.xyz/api/sdk/v1";
const headers = { "Cache-Control": "no-store" };
const errorResponse = (error: string, status: number) =>
  NextResponse.json({ error }, { status, headers });
const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

async function upstream(url: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(50_000),
  });
  const body: unknown = await response.json();
  if (!isObject(body)) throw new Error("Invalid Markee API response");
  return NextResponse.json(body, { status: response.status, headers });
}

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
    return errorResponse("Invalid Markee claim authorization request.", 400);
  const challenge = body.action === "challenge";
  const verify = body.action === "verify";
  if (
    challenge ?
      typeof body.chainId !== "number" ||
      !Number.isSafeInteger(body.chainId) ||
      !Object.prototype.hasOwnProperty.call(chainConfigMap, body.chainId) ||
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
    return errorResponse("Invalid Markee claim authorization request.", 400);
  }

  try {
    return await upstream(`${API}/community/claim`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
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
    });
  } catch {
    // A failed response after verify may hide a submitted transaction. Never
    // retry the signed POST; callers can recover by operation ID.
    return errorResponse(
      "Unable to reach Markee. Check claim status before authorizing again.",
      502,
    );
  }
}

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("operationId");
  if (!id || !/^[a-f0-9]{64}$/u.test(id))
    return errorResponse("Invalid Markee claim operation.", 400);
  try {
    return await upstream(`${API}/operations/${id}`);
  } catch {
    return errorResponse("Unable to check the Markee claim status.", 502);
  }
}
