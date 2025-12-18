import pinataSDK from "@pinata/sdk";
import { NextResponse } from "next/server";

const PINATA_POINTS_SNAPSHOT_NAME = "superfluid-activity-points-gd";
const PINATA_POINTS_SNAPSHOT_CID =
  process.env.SUPERFLUID_GD_POINTS_SNAPSHOT_CID ??
  process.env.SUPERFLUID_POINTS_SNAPSHOT_CID ??
  null;
const normalizeGateway = (gw?: string | null) => {
  if (!gw || gw.trim() === "") return "https://gateway.pinata.cloud";
  const trimmed = gw.trim().replace(/\/$/, "");
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
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
        console.warn("[leaderboard-gd] failed to init pinata SDK", error);
        return null;
      }
    })()
  : null;

const fetchIpfsJson = async <T = any>(cid: string): Promise<T | null> => {
  if (!cid) return null;
  try {
    const res = await fetch(`${IPFS_GATEWAY}/ipfs/${cid}`);
    if (!res.ok) {
      console.warn("[leaderboard-gd] ipfs fetch failed", {
        cid,
        status: res.status,
        statusText: res.statusText,
      });
      return null;
    }
    return (await res.json()) as T;
  } catch (error) {
    console.warn("[leaderboard-gd] ipfs fetch error", { cid, error });
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
      pageLimit: 20,
      pageOffset: 0,
    });
    const rows = Array.isArray(res?.rows) ? res.rows : [];
    let latest: { cid: string; pinnedAt: number } | null = null;
    for (const row of rows) {
      const name = row?.metadata?.name;
      const cid = row?.ipfs_pin_hash;
      if (name !== PINATA_POINTS_SNAPSHOT_NAME || !cid) continue;
      const pinnedAtStr = row?.date_pinned ?? row?.metadata?.timestamp;
      const pinnedAt = pinnedAtStr ? Date.parse(pinnedAtStr) : Number.NaN;
      const pinnedAtMs = Number.isNaN(pinnedAt) ? 0 : pinnedAt;
      if (!latest || pinnedAtMs > latest.pinnedAt) {
        latest = { cid, pinnedAt: pinnedAtMs };
      }
    }
    if (!latest) {
      console.warn("[leaderboard-gd] no exact points snapshot found", {
        totalPins: rows.length,
      });
    }
    return latest?.cid ?? null;
  } catch (error) {
    console.warn("[leaderboard-gd] pinList error", { error });
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
        const { bonusPoints, communityPoints, ...rest } = w;
        delete (rest as any).existingPoints;
        delete (rest as any).addedPoints;
        delete (rest as any).checksum;
        delete (rest as any).nativeSuperToken;
        delete (rest as any).nativeToken;
        delete (rest as any).targetPoints;

        const renamed: Record<string, any> = { ...rest };
        if (typeof bonusPoints === "number") {
          renamed.superfluidActivityPoints = bonusPoints;
        }
        if (typeof communityPoints === "number") {
          renamed.governanceStakePoints = communityPoints;
        }
        return renamed;
      }),
    };
  }
  return data;
};

const parseNumberEnv = (value?: string, fallback = 0) => {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const revalidate = 0;

const TARGET_STREAM_SUP = parseNumberEnv(
  process.env.SUPERFLUID_GD_TARGET_STREAM_SUP,
);
const TOTAL_STREAMED_SUP_FALLBACK = parseNumberEnv(
  process.env.SUPERFLUID_GD_TOTAL_STREAMED_SUP_FALLBACK,
);

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

    return NextResponse.json({
      cid,
      snapshot: sanitized,
      totalStreamedSup: TOTAL_STREAMED_SUP_FALLBACK,
      targetStreamSup: TARGET_STREAM_SUP,
    });
  } catch (error) {
    console.error("[leaderboard-gd] unexpected error", { error });
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 },
    );
  }
}
