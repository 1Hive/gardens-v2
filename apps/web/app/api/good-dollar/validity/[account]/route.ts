// api/passport/[account]

import { NextResponse } from "next/server";
import { fetchGooddollarWhitelisted } from "@/utils/goodDollar";

interface Params {
  params: {
    account: string;
  };
}

export async function GET(request: Request, { params }: Params) {
  const { account } = params;
  if (!account) {
    return NextResponse.json(
      { error: "Account address is required" },
      { status: 400 },
    );
  }
  try {
    console.info("[good-dollar][validity] request", { account });
    const data = await fetchGooddollarWhitelisted(account);
    console.info("[good-dollar][validity] result", {
      account,
      isWhitelisted: data,
    });
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error("[good-dollar][validity] error", { account, error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
