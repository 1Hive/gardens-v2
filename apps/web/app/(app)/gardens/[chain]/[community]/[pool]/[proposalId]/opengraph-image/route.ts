import type { ProposalPageParams } from "../client-page";
import Image from "../opengraph-image";

type ProposalSearchParams = {
  status?: string;
  title?: string;
  poolType?: string;
  poolTitle?: string;
  communityName?: string;
};

type RouteContext = {
  params: ProposalPageParams;
};

export const runtime = "edge";

export async function GET(request: Request, { params }: RouteContext) {
  const url = new URL(request.url);
  const searchParams: ProposalSearchParams = {
    status: url.searchParams.get("status") ?? undefined,
    title: url.searchParams.get("title") ?? undefined,
    poolType: url.searchParams.get("poolType") ?? undefined,
    poolTitle: url.searchParams.get("poolTitle") ?? undefined,
    communityName: url.searchParams.get("communityName") ?? undefined,
  };

  return Image({
    params: Promise.resolve(params),
    searchParams: Promise.resolve(searchParams),
  });
}
