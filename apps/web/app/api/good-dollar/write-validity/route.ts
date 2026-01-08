import { NextResponse } from "next/server";
import {
  getGoodDollarChainIds,
  isGoodDollarWhitelisted,
  validateUserOnChain,
} from "./validation";

export async function POST(req: Request) {
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

  const isWhitelisted = await isGoodDollarWhitelisted(user);
  if (!isWhitelisted) {
    return NextResponse.json(
      { error: "User is not whitelisted in GoodDollar" },
      { status: 400 },
    );
  }

  const chainIds = getGoodDollarChainIds();
  const results = [];
  for (const chainId of chainIds) {
    // Run sequentially to avoid overloading RPC endpoints and to reuse allowlist check
    const res = await validateUserOnChain(chainId, user, isWhitelisted);
    results.push(res);
  }

  const successCount = results.filter((r) => r.status === "success").length;
  const alreadyValidCount = results.filter(
    (r) => r.status === "already-valid",
  ).length;
  const errorCount = results.filter((r) => r.status === "error").length;
  const skippedCount = results.filter((r) => r.status === "skipped").length;

  const status =
    successCount > 0 || alreadyValidCount > 0 ? 200 : errorCount > 0 ? 500 : 400;

  return NextResponse.json(
    {
      message: `Processed GoodDollar validity on ${chainIds.length} chains`,
      summary: {
        success: successCount,
        alreadyValid: alreadyValidCount,
        skipped: skippedCount,
        errors: errorCount,
      },
      results,
    },
    { status },
  );
}
