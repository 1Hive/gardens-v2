import { NextResponse } from "next/server";

export const revalidate = 0;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.toString();
  const redirectPath = `/api/superfluid-points-gd${query ? `?${query}` : ""}`;
  return NextResponse.json(
    {
      error: "Deprecated endpoint",
      message:
        "Use /api/superfluid-points-gd instead of /api/superfluid-stack-gd.",
      redirect: redirectPath,
    },
    { status: 410 },
  );
}
