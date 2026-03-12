import Image from "../opengraph-image";

type RouteContext = {
  params: {
    chain: string;
    community: string;
  };
};

export const runtime = "edge";

export async function GET(_: Request, { params }: RouteContext) {
  return Image({ params });
}
