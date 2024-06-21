import { isProd } from "@/constants/contracts";
import Ably from "ably";
import { NextResponse, NextRequest } from "next/server";

const ably = new Ably.Rest({ key: process.env.NEXT_ABLY_API_KEY });

export async function GET(req: NextRequest, res: NextResponse) {
  try {
    const tokenRequestData = {
      capability: JSON.stringify({ "*": ["publish", "subscribe", "presence"] }), // Adjust based on your needs
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
