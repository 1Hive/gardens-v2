import pinataSDK from "@pinata/sdk";
import { NextResponse } from "next/server";
import { createClient, fetchExchange, gql } from "urql";
import { chainConfigMap } from "@/configs/chains";

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

export const revalidate = 0;

// Pull total streamed from Superfluid subgraph (Base mainnet)
const SUPERFLUID_CHAIN_ID = 8453;
const GARDENS_GDA_ID = "0x5f86aeb40ea66373c7ce337f777c37951fdaaeea";
const SUPERFLUID_POOL_TOTALS_QUERY = gql`
  query poolTotals($id: ID!) {
    pool(id: $id) {
      totalAmountDistributedUntilUpdatedAt
    }
  }
`;
const TOTAL_STREAMED_SUP_FALLBACK = 3_578;
const TARGET_STREAM_SUP = 847_000;

const fetchSuperfluidTotals = async (): Promise<number | null> => {
  const chainConfig = chainConfigMap[SUPERFLUID_CHAIN_ID];
  const superfluidSubgraphUrl =
    chainConfig?.publishedSuperfluidSubgraphUrl ??
    chainConfig?.superfluidSubgraphUrl;

  if (!superfluidSubgraphUrl) {
    console.warn("[leaderboard] missing superfluid subgraph url", {
      chainId: SUPERFLUID_CHAIN_ID,
    });
    return null;
  }

  try {
    const client = createClient({
      url: superfluidSubgraphUrl,
      exchanges: [fetchExchange],
    });
    const res = await client
      .query(SUPERFLUID_POOL_TOTALS_QUERY, {
        id: GARDENS_GDA_ID.toLowerCase(),
      })
      .toPromise();

    if (res.error) {
      console.warn("[leaderboard] superfluid pool totals query failed", {
        error: res.error.message,
      });
      return null;
    }

    const total =
      res.data?.pool?.totalAmountDistributedUntilUpdatedAt ?? null;
    if (!total) return null;

    const totalSup = Number(BigInt(total)) / 1e18;
    if (Number.isNaN(totalSup)) return null;
    return totalSup;
  } catch (error) {
    console.warn("[leaderboard] superfluid pool totals fetch error", { error });
    return null;
  }
};

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
    const totalStreamedSup =
      (await fetchSuperfluidTotals()) ?? TOTAL_STREAMED_SUP_FALLBACK;

    return NextResponse.json({
      cid,
      snapshot: sanitized,
      totalStreamedSup,
      targetStreamSup: TARGET_STREAM_SUP,
    });
  } catch (error) {
    console.error("[leaderboard] unexpected error", { error });
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 },
    );
  }
}
