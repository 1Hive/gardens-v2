// api/ably-auth

import Ably from "ably";
import { NextResponse } from "next/server";
import { HTTP_CODES } from "../utils";
import { CHANGE_EVENT_CHANNEL_NAME } from "@/globals";

export async function POST() {
  // Used for linter that fails
  if (!process.env.NEXT_ABLY_API_KEY) {
    console.error("NEXT_ABLY_API_KEY env must be");
    return NextResponse.json({
      status: HTTP_CODES.SERVER_ERROR,
      message: "No auth",
    });
  }

  const ably = new Ably.Rest({ key: process.env.NEXT_ABLY_API_KEY });

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
      status: HTTP_CODES.SERVER_ERROR,
      message: "Failed to generate token",
      error: process.env.NODE_ENV === "production" ? undefined : error,
    });
  }
}
