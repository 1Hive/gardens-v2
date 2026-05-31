// api/ipfs
import { Readable } from "stream";
import pinataSDK from "@pinata/sdk";
import { NextRequest, NextResponse } from "next/server";

const pinata = new pinataSDK({ pinataJWTKey: process.env.PINATA_JWT });
const RATE_LIMIT_MAX_REQUESTS_PER_DAY = 5;
const RATE_LIMIT_MAX_REQUESTS_PER_DAY_BY_PURPOSE: Record<string, number> = {
  "proposal-create": 20,
};
const RATE_LIMIT_PIN_NAME = "ipfs-upload-rate-limit";
const IPFS_WALLET_HEADER = "x-gardens-wallet-address";
const IPFS_PURPOSE_HEADER = "x-gardens-ipfs-purpose";
const DEFAULT_RATE_LIMIT_PURPOSE = "unknown";

type RateLimitState = {
  expiresAt: string;
  scopes: Record<string, number[]>;
};

type RateLimitScope = {
  key: string;
  clientIp: string;
  purpose: string;
  scopeType: "wallet" | "ip";
  walletAddress?: string;
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
  scopes: {},
});

const normalizeWalletAddress = (value: string | null) => {
  if (!value) return undefined;

  const normalized = value.trim().toLowerCase();

  if (!/^0x[a-f0-9]{40}$/i.test(normalized)) {
    return undefined;
  }

  return normalized;
};

const normalizeScopeSegment = (value: string | null | undefined) => {
  if (!value) return undefined;

  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9/_:-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-/]+|[-/]+$/g, "")
    .slice(0, 120);

  return normalized || undefined;
};

const getRefererPath = (req: NextRequest) => {
  const referer = req.headers.get("referer");

  if (!referer) return undefined;

  try {
    return normalizeScopeSegment(new URL(referer).pathname);
  } catch {
    return undefined;
  }
};

const getRateLimitScope = (req: NextRequest): RateLimitScope => {
  const clientIp = getClientIp(req);
  const walletAddress = normalizeWalletAddress(req.headers.get(IPFS_WALLET_HEADER));
  const purpose =
    normalizeScopeSegment(req.headers.get(IPFS_PURPOSE_HEADER)) ??
    getRefererPath(req) ??
    DEFAULT_RATE_LIMIT_PURPOSE;

  if (walletAddress) {
    return {
      key: `wallet:${walletAddress}:${purpose}`,
      clientIp,
      purpose,
      scopeType: "wallet",
      walletAddress,
    };
  }

  return {
    key: `ip:${clientIp}:${purpose}`,
    clientIp,
    purpose,
    scopeType: "ip",
  };
};

const getRateLimitLimit = (scope: RateLimitScope) =>
  RATE_LIMIT_MAX_REQUESTS_PER_DAY_BY_PURPOSE[scope.purpose] ??
  RATE_LIMIT_MAX_REQUESTS_PER_DAY;

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
    const rawScopes =
      payload.scopes ?? (payload as Partial<{ ips: Record<string, number[]> }>).ips;

    if (
      typeof payload?.expiresAt !== "string" ||
      rawScopes == null ||
      typeof rawScopes !== "object"
    ) {
      return getFreshRateLimitState();
    }

    return {
      expiresAt: payload.expiresAt,
      scopes: Object.fromEntries(
        Object.entries(rawScopes).map(([scopeKey, timestamps]) => [
          scopeKey,
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
        scopeCount: Object.keys(state.scopes).length,
      },
    } as any,
  });
};

const getRateLimitResponse = async (scope: RateLimitScope) => {
  const now = Date.now();
  const storedState = await getLatestRateLimitState();
  const state =
    Date.parse(storedState.expiresAt) <= now ?
      getFreshRateLimitState()
    : storedState;

  const requestTimestamps = (state.scopes[scope.key] ?? []).filter(
    (timestamp) => timestamp < Date.parse(state.expiresAt),
  );
  const limit = getRateLimitLimit(scope);

  if (requestTimestamps.length >= limit) {
    const retryAfterSec = Math.max(
      1,
      Math.ceil((Date.parse(state.expiresAt) - now) / 1000),
    );

    console.warn("[ipfs] rate limited", {
      clientIp: scope.clientIp,
      walletAddress: scope.walletAddress,
      purpose: scope.purpose,
      scopeType: scope.scopeType,
      used: requestTimestamps.length,
      limit,
      retryAfterSec,
    });

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
  state.scopes[scope.key] = requestTimestamps;

  try {
    await persistRateLimitState(state);
  } catch (error) {
    console.warn("[ipfs] failed to persist rate limit state", error);
  }

  console.info("[ipfs] rate limit accepted", {
    clientIp: scope.clientIp,
    walletAddress: scope.walletAddress,
    purpose: scope.purpose,
    scopeType: scope.scopeType,
    used: requestTimestamps.length,
    limit,
  });

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
  const contentType = req.headers.get("content-type");
  const scope = getRateLimitScope(req);

  console.info("[ipfs] request", {
    contentType,
    clientIp: scope.clientIp,
    walletAddress: scope.walletAddress,
    purpose: scope.purpose,
    scopeType: scope.scopeType,
  });

  const rateLimitResponse = await getRateLimitResponse(scope);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  if (contentType === "application/json") {
    const data = await req.json();
    const payloadSize = JSON.stringify(data).length;

    try {
      const response = await pinata.pinJSONToIPFS(data);

      console.info("[ipfs] json upload success", {
        clientIp: scope.clientIp,
        walletAddress: scope.walletAddress,
        purpose: scope.purpose,
        scopeType: scope.scopeType,
        payloadSize,
        cid: response.IpfsHash,
      });

      return NextResponse.json(response, { status: 201 });
    } catch (error) {
      console.error("[ipfs] json upload error", {
        clientIp: scope.clientIp,
        walletAddress: scope.walletAddress,
        purpose: scope.purpose,
        scopeType: scope.scopeType,
        payloadSize,
        error,
      });

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
        console.warn("[ipfs] file upload missing file", {
          clientIp: scope.clientIp,
          walletAddress: scope.walletAddress,
          purpose: scope.purpose,
          scopeType: scope.scopeType,
        });

        return NextResponse.json({ success: false });
      }

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const response = await saveFile(buffer, file.name);

      console.info("[ipfs] file upload success", {
        clientIp: scope.clientIp,
        walletAddress: scope.walletAddress,
        purpose: scope.purpose,
        scopeType: scope.scopeType,
        fileName: file.name,
        fileSize: file.size,
        cid: response.IpfsHash,
      });

      return NextResponse.json(response, { status: 201 });
    } catch (error) {
      console.error("[ipfs] file upload error", {
        clientIp: scope.clientIp,
        walletAddress: scope.walletAddress,
        purpose: scope.purpose,
        scopeType: scope.scopeType,
        error,
      });

      return NextResponse.json(
        { message: "Error uploading file to IPFS" },
        { status: 500 },
      );
    }
  } else {
    console.warn("[ipfs] invalid request", {
      clientIp: scope.clientIp,
      walletAddress: scope.walletAddress,
      purpose: scope.purpose,
      scopeType: scope.scopeType,
      contentType,
    });

    return NextResponse.json({ message: "Invalid request" }, { status: 400 });
  }
}
