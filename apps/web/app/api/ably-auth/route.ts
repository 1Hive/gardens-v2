import { isProd } from "@/constants/contracts";
import { CHANGE_EVENT_CHANNEL_NAME } from "@/globals";
import Ably from "ably";
import { NextResponse, NextRequest } from "next/server";

const ably = new Ably.Rest({ key: process.env.NEXT_ABLY_API_KEY });

export async function POST(req: NextRequest, res: NextResponse) {
  // Used for linter that fails
  console.log({
    "process.env.NEXT_ABLY_API_KEY": process.env.NEXT_ABLY_API_KEY,
  });
  if (!process.env.NEXT_ABLY_API_KEY) {
    console.error("NEXT_ABLY_API_KEY env must be");
    return NextResponse.json({
      status: 200,
      message: "No auth",
    });
  }

  try {
    const tokenRequestData = {
      capability: JSON.stringify({
        [CHANGE_EVENT_CHANNEL_NAME]: ["publish", "subscribe", "presence"],
      }),
    };
    const tokenDetails = await ably.auth.createTokenRequest(tokenRequestData);
    return NextResponse.json(tokenDetails);
  } catch (error) {
    console.error(error);
    return NextResponse.json({
      status: 500,
      message: "Failed to generate token",
      error: isProd ? undefined : error,
    });
  }
}
