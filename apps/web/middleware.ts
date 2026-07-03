import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getCommunityRedirectPath } from "@/utils/communityRedirects";

export function middleware(request: NextRequest) {
  const [, gardensSegment, chain, community] = request.nextUrl.pathname.split(
    "/",
  );

  if (gardensSegment !== "gardens" || !chain || !community) {
    return NextResponse.next();
  }

  const redirectPath = getCommunityRedirectPath(
    chain,
    community,
  );

  if (!redirectPath) {
    return NextResponse.next();
  }

  const redirectUrl = new URL(redirectPath, request.url);
  redirectUrl.search = request.nextUrl.search;

  return NextResponse.redirect(redirectUrl);
}

export const config = {
  matcher: ["/gardens/:chain/:community/:path*"],
};
