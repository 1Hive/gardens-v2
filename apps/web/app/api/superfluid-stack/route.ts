import { NextResponse } from "next/server";

export const revalidate = 0;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.toString();
  const redirectPath = `/api/superfluid-points${query ? `?${query}` : ""}`;
  return NextResponse.json(
    {
      error: "Deprecated endpoint",
      message: "Use /api/superfluid-points instead of /api/superfluid-points.",
      redirect: redirectPath,
    },
    { status: 410 },
  );
}
