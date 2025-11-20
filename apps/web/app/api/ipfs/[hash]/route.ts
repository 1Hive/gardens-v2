// api/ipfs/[hash]

import { Params } from "next/dist/shared/lib/router/utils/route-matcher";
import { NextRequest } from "next/server";

const ipfsGateway = process.env.IPFS_GATEWAY ?? "ipfs.io";
export async function GET(req: NextRequest, { params }: Params) {
  const { hash } = params;
  const searchParams = new URL(req.url).searchParams;
  const ipfsUri = `https://${ipfsGateway}/ipfs/${hash}?${process.env.PINATA_KEY ? "pinataGatewayToken=" + process.env.PINATA_KEY : ""}`;
  const res = await fetch(ipfsUri, {
    method: "GET",
    headers: {
      "content-type": "application/json",
    },
  });

  if (!res.ok) {
    return Response.json(
      {
        message: "Error fetching IPFS content",
        status: res.status,
        details: await res.text(),
      },
      {
        status: res.status ?? 500,
      },
    );
  }
  const contentType = res.headers.get("content-type") ?? "application/json";

  if (contentType.startsWith("image/")) {
    const buffer = await res.arrayBuffer();
    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  }

  if (searchParams.get("isText") === "true") {
    const text = await res.text();
    return Response.json({ text }, { status: 200 });
  } else {
    const content = await res.json();
    return Response.json(content, { status: 200 });
  }
}
