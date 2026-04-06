// api/ipfs
import { Readable } from "stream";
import pinataSDK from "@pinata/sdk";
import { NextRequest, NextResponse } from "next/server";

const pinata = new pinataSDK({ pinataJWTKey: process.env.PINATA_JWT });
const RATE_LIMIT_MAX_REQUESTS_PER_DAY = 5;
const RATE_LIMIT_PIN_NAME = "ipfs-upload-rate-limit";

type RateLimitState = {
  expiresAt: string;
  ips: Record<string, number[]>;
};

const getClientIp = (req: NextRequest) => {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() ?? "unknown";
  }

  const realIp = req.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }

  return "unknown";
};

const getIpfsGatewayUrl = (cid: string) => {
  const gateway = process.env.IPFS_GATEWAY?.trim().replace(/\/$/, "");
  if (!gateway) {
    return `https://gateway.pinata.cloud/ipfs/${cid}`;
  }

  const baseUrl =
    gateway.startsWith("http://") || gateway.startsWith("https://") ?
      gateway
    : `https://${gateway}`;
  const gatewayToken =
    process.env.PINATA_KEY ?
      `?pinataGatewayToken=${process.env.PINATA_KEY}`
    : "";

  return `${baseUrl}/ipfs/${cid}${gatewayToken}`;
};

const getNextDailyExpiry = () => {
  const expiresAt = new Date();
  expiresAt.setUTCHours(24, 0, 0, 0);
  return expiresAt.toISOString();
};

const getFreshRateLimitState = (): RateLimitState => ({
  expiresAt: getNextDailyExpiry(),
  ips: {},
});

const getLatestRateLimitState = async (): Promise<RateLimitState> => {
  try {
    const data = await pinata.pinList({
      status: "pinned",
      metadata: { name: RATE_LIMIT_PIN_NAME, keyvalues: {} },
      pageLimit: 100,
      pageOffset: 0,
    });

    const rows = Array.isArray(data?.rows) ? data.rows : [];
    let latestCid: string | null = null;
    let latestPinnedAt = 0;

    for (const row of rows) {
      if (row?.metadata?.name !== RATE_LIMIT_PIN_NAME || !row?.ipfs_pin_hash) {
        continue;
      }

      const pinnedAt = row?.date_pinned ? Date.parse(row.date_pinned) : 0;
      if (pinnedAt >= latestPinnedAt) {
        latestPinnedAt = pinnedAt;
        latestCid = row.ipfs_pin_hash;
      }
    }

    if (!latestCid) {
      return getFreshRateLimitState();
    }

    const response = await fetch(getIpfsGatewayUrl(latestCid), {
      cache: "no-store",
    });
    if (!response.ok) {
      return getFreshRateLimitState();
    }

    const payload = (await response.json()) as Partial<RateLimitState>;
    if (
      typeof payload?.expiresAt !== "string" ||
      payload.ips == null ||
      typeof payload.ips !== "object"
    ) {
      return getFreshRateLimitState();
    }

    return {
      expiresAt: payload.expiresAt,
      ips: Object.fromEntries(
        Object.entries(payload.ips).map(([ip, timestamps]) => [
          ip,
          Array.isArray(timestamps) ?
            timestamps.filter(
              (timestamp): timestamp is number => typeof timestamp === "number",
            )
          : [],
        ]),
      ),
    };
  } catch (error) {
    console.warn("[ipfs] failed to load rate limit state", error);
    return getFreshRateLimitState();
  }
};

const persistRateLimitState = async (state: RateLimitState) => {
  await pinata.pinJSONToIPFS(state, {
    pinataMetadata: {
      name: RATE_LIMIT_PIN_NAME,
      keyvalues: {
        expiresAt: state.expiresAt,
        updatedAt: new Date().toISOString(),
      },
    } as any,
  });
};

const getRateLimitResponse = async (req: NextRequest) => {
  const now = Date.now();
  const clientIp = getClientIp(req);
  const storedState = await getLatestRateLimitState();
  const state =
    Date.parse(storedState.expiresAt) <= now ?
      getFreshRateLimitState()
    : storedState;

  const requestTimestamps = (state.ips[clientIp] ?? []).filter(
    (timestamp) => timestamp < Date.parse(state.expiresAt),
  );

  if (requestTimestamps.length >= RATE_LIMIT_MAX_REQUESTS_PER_DAY) {
    const retryAfterSec = Math.max(
      1,
      Math.ceil((Date.parse(state.expiresAt) - now) / 1000),
    );

    return NextResponse.json(
      { message: "Daily upload limit reached" },
      {
        status: 429,
        headers: {
          "Retry-After": retryAfterSec.toString(),
        },
      },
    );
  }

  requestTimestamps.push(now);
  state.ips[clientIp] = requestTimestamps;

  try {
    await persistRateLimitState(state);
  } catch (error) {
    console.warn("[ipfs] failed to persist rate limit state", error);
  }

  return null;
};

const saveFile = async (buffer: Buffer, fileName: string) => {
  const readable = new Readable();
  readable.push(buffer);
  readable.push(null);

  const options = {
    pinataMetadata: {
      name: fileName,
    },
  };
  const response = await pinata.pinFileToIPFS(readable, options);

  return response;
};

export async function POST(req: NextRequest) {
  const rateLimitResponse = await getRateLimitResponse(req);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const contentType = req.headers.get("content-type");

  if (contentType === "application/json") {
    const data = await req.json();
    try {
      const response = await pinata.pinJSONToIPFS(data);
      return NextResponse.json(response, { status: 201 });
    } catch (error) {
      return NextResponse.json(
        { message: "Error uploading json to IPFS" },
        { status: 500 },
      );
    }
  } else if (contentType?.startsWith("multipart/form-data")) {
    try {
      const data = await req.formData();
      const file: File | null = data.get("file") as File | null;

      if (!file) {
        return NextResponse.json({ success: false });
      }

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const response = await saveFile(buffer, file.name);

      return NextResponse.json(response, { status: 201 });
    } catch (error) {
      return NextResponse.json(
        { message: "Error uploading file to IPFS" },
        { status: 500 },
      );
    }
  } else {
    return NextResponse.json({ message: "Invalid request" }, { status: 400 });
  }
}
