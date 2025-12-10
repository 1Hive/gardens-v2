import pinataSDK from "@pinata/sdk";
import { NextResponse } from "next/server";

const PINATA_POINTS_SNAPSHOT_NAME = "superfluid-activity-points";
const PINATA_POINTS_SNAPSHOT_CID =
  process.env.SUPERFLUID_POINTS_SNAPSHOT_CID ?? null;
const normalizeGateway = (gw?: string | null) => {
  if (!gw || gw.trim() === "") return "https://gateway.pinata.cloud";
  const trimmed = gw.trim().replace(/\/$/, "");
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  // Assume https if protocol omitted
  return `https://${trimmed}`;
};
const IPFS_GATEWAY = normalizeGateway(process.env.IPFS_GATEWAY);

const PINATA_JWT = process.env.PINATA_JWT;
const PINATA_KEY = process.env.PINATA_KEY;
const PINATA_SECRET = process.env.PINATA_SECRET;

const pinataClient =
  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
  PINATA_JWT || (PINATA_KEY && PINATA_SECRET) ?
    (() => {
      try {
        return new pinataSDK({
          pinataJWTKey: PINATA_JWT,
          pinataApiKey: PINATA_KEY,
          pinataSecretApiKey: PINATA_SECRET,
        });
      } catch (error) {
        console.warn("[leaderboard] failed to init pinata SDK", error);
        return null;
      }
    })()
  : null;

const fetchIpfsJson = async <T = any>(cid: string): Promise<T | null> => {
  if (!cid) return null;
  try {
    const res = await fetch(`${IPFS_GATEWAY}/ipfs/${cid}`);
    if (!res.ok) {
      console.warn("[leaderboard] ipfs fetch failed", {
        cid,
        status: res.status,
        statusText: res.statusText,
      });
      return null;
    }
    return (await res.json()) as T;
  } catch (error) {
    console.warn("[leaderboard] ipfs fetch error", { cid, error });
    return null;
  }
};

const resolveLatestPointsCid = async (): Promise<string | null> => {
  if (PINATA_POINTS_SNAPSHOT_CID) return PINATA_POINTS_SNAPSHOT_CID;
  if (!pinataClient) return null;
  try {
    const res = await pinataClient.pinList({
      status: "pinned",
      metadata: { name: PINATA_POINTS_SNAPSHOT_NAME, keyvalues: {} },
      pageLimit: 1,
      pageOffset: 0,
    });
    return res?.rows?.[0]?.ipfs_pin_hash ?? null;
  } catch (error) {
    console.warn("[leaderboard] pinList error", { error });
    return null;
  }
};

const stripSnapshot = (data: any) => {
  if (!data || typeof data !== "object") return data;
  if (Array.isArray(data.wallets)) {
    return {
      ...data,
      wallets: data.wallets.map((w: any) => {
        if (!w || typeof w !== "object") return w;
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const {
          existingPoints,
          addedPoints,
          checksum,
          nativeSuperToken,
          nativeToken,
          ...rest
        } = w;
        return rest;
      }),
    };
  }
  return data;
};

export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const cidFromQuery = url.searchParams.get("cid");
    const cid =
      cidFromQuery ??
      PINATA_POINTS_SNAPSHOT_CID ??
      (await resolveLatestPointsCid());

    if (!cid) {
      return NextResponse.json(
        { error: "No points snapshot available" },
        { status: 404 },
      );
    }

    const data = await fetchIpfsJson<any>(cid);
    if (!data || typeof data !== "object") {
      return NextResponse.json(
        { error: "Failed to read snapshot from IPFS", cid },
        { status: 502 },
      );
    }

    const sanitized = stripSnapshot(data);

    return NextResponse.json({ cid, snapshot: sanitized });
  } catch (error) {
    console.error("[leaderboard] unexpected error", { error });
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 },
    );
  }
}
