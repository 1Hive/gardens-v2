import { NextResponse } from "next/server";
import { isGoodDollarWhitelisted, validateUserOnChain } from "../validation";

interface Params {
  params: { chain?: string };
}

export async function POST(req: Request, { params }: Params) {
  const { chain: chainId } = params ?? {};

  if (!chainId) {
    return NextResponse.json(
      { error: "Chain id is required" },
      { status: 400 },
    );
  }

  let user: unknown;
  try {
    ({ user } = await req.json());
  } catch (error) {
    console.error("Failed to parse body", error);
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (typeof user !== "string") {
    return NextResponse.json(
      { error: "User address is required" },
      { status: 400 },
    );
  }

  try {
    const isWhitelisted = await isGoodDollarWhitelisted(user);
    if (!isWhitelisted) {
      return NextResponse.json(
        { error: "User is not whitelisted in GoodDollar" },
        { status: 400 },
      );
    }

    const result = await validateUserOnChain(chainId, user, isWhitelisted);

    if (result.status === "success") {
      return NextResponse.json({
        message: "Validity set successfully",
        transactionHash: result.transactionHash,
      });
    }

    if (result.status === "already-valid") {
      return NextResponse.json({
        message: "User already validated on Gooddollar Sybil smart contract",
        isValid: true,
      });
    }

    if (result.status === "skipped") {
      return NextResponse.json(
        { error: result.message },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: result.message },
      { status: 500 },
    );
  } catch (error) {
    console.error("Error validating user", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
