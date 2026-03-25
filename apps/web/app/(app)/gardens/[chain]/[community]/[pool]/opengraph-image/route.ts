import Image from "../opengraph-image";

type RouteContext = {
  params: {
    chain: string;
    community: string;
    pool: string;
  };
};

export const runtime = "nodejs";

export async function GET(_: Request, { params }: RouteContext) {
  return Image({ params });
}
