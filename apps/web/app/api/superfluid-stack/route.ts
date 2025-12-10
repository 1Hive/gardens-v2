/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
import pinataSDK from "@pinata/sdk";
import { Client as NotionClient } from "@notionhq/client";
import { NextResponse } from "next/server";
import { Client, createClient, fetchExchange, gql } from "urql";
import { Address, createPublicClient, formatUnits, http, parseAbi } from "viem";
import { chainConfigMap } from "@/configs/chains";
import { getTokenUsdPrice } from "@/services/coingecko";
import {
  STACK_DRY_RUN,
  superfluidStackClient,
} from "@/services/superfluid-stack";
import { erc20ABI } from "@/src/generated";
import { ChainId } from "@/types";
import { getViemChain } from "@/utils/web3";

type Strategy = {
  id: Address;
  poolId: string;
  token: Address;
  metadata?: { title?: string | null } | null;
  config: { superfluidToken?: Address | null; proposalType?: string | null };
};

type StreamEntry = {
  sender: { id: Address };
  currentFlowRate: string;
  createdAtTimestamp: string;
  updatedAtTimestamp: string;
};

type FlowUpdate = {
  sender: { id: Address };
  flowRate: string;
  timestamp: string;
};

type SuperTokenResult = {
  id: Address;
  name: string;
  symbol: string;
  isListed?: boolean;
  createdAtBlockNumber?: string;
};

type ManualBoundEntry = {
  startBlock?: bigint;
  endBlock?: bigint;
};

type CommunityInfo = {
  id: string;
  communityName?: string | null;
  members: { memberAddress: Address; stakedTokens: bigint }[];
  pools: {
    poolAddress: Address;
    token: Address;
    superfluidToken?: Address | null;
    title?: string | null;
  }[];
};

type ProcessedCommunity = {
  communityId: string;
  communityName?: string | null;
  pools: {
    poolAddress: string;
    token: string;
    superfluidToken?: string | null;
    title?: string | null;
  }[];
};

const TARGET_CHAINS: ChainId[] = [137, 42220, 8453, 100, 42161, 10];
const BASE_BONUS_COMMUNITY: Address =
  "0xec83d957f8aa4e9601bc74608ebcbc862eca52ab";
const {
  manualBoundsByChain: MANUAL_BLOCK_BOUNDS,
  manualBoundsWindow: MANUAL_BOUNDS_WINDOW,
}: {
  manualBoundsByChain: Partial<Record<ChainId, ManualBoundEntry>>;
  manualBoundsWindow: { startTimestamp?: number; endTimestamp?: number };
} = (() => {
  const raw = process.env.MANUAL_BLOCK_BOUNDS;
  if (!raw) return { manualBoundsByChain: {}, manualBoundsWindow: {} };
  try {
    const parsed = JSON.parse(raw) as Record<
      string,
      { startBlock?: string | number; endBlock?: string | number }
    > & { startTimestamp?: string | number; endTimestamp?: string | number };

    const manualBoundsWindow = {
      startTimestamp:
        parsed.startTimestamp != null ?
          Number(parsed.startTimestamp)
        : undefined,
      endTimestamp:
        parsed.endTimestamp != null ? Number(parsed.endTimestamp) : undefined,
    };

    const boundsEntries = Object.entries(parsed)
      .filter(([k]) => !["startTimestamp", "endTimestamp"].includes(k))
      .map(([k, v]) => {
        if (typeof v !== "object" || v === null) return null;
        const chainId = Number(k) as ChainId;
        return [
          chainId,
          {
            startBlock:
              (v as { startBlock?: string | number }).startBlock != null ?
                BigInt(
                  (v as { startBlock?: string | number }).startBlock as
                    | string
                    | number,
                )
              : undefined,
            endBlock:
              (v as { endBlock?: string | number }).endBlock != null ?
                BigInt(
                  (v as { endBlock?: string | number }).endBlock as
                    | string
                    | number,
                )
              : undefined,
          },
        ] as const;
      })
      .filter(Boolean) as Array<[ChainId, ManualBoundEntry]>;

    return {
      manualBoundsByChain: Object.fromEntries(boundsEntries),
      manualBoundsWindow,
    };
  } catch (error) {
    console.warn("Failed to parse MANUAL_BLOCK_BOUNDS, ignoring", error);
    return { manualBoundsByChain: {}, manualBoundsWindow: {} };
  }
})();

const SUPERFLUID_POOLS_QUERY = gql`
  query superfluidPools {
    cvstrategies(where: { isEnabled: true, archived: false }) {
      id
      poolId
      token
      metadata {
        title
      }
      config {
        superfluidToken
        proposalType
      }
    }
  }
`;

const SUPER_TOKEN_QUERY = gql`
  query superToken($token: String!) {
    tokens(
      where: {
        and: [
          { isSuperToken: true }
          { or: [{ underlyingToken: $token }, { id: $token }] }
        ]
      }
      orderBy: isListed
      orderDirection: desc
    ) {
      id
      name
      isListed
      symbol
      createdAtBlockNumber
    }
  }
`;

const COMMUNITY_QUERY = gql`
  query communities {
    registryCommunities(where: { archived: false }) {
      id
      communityName
      members {
        memberAddress
        stakedTokens
      }
      strategies(where: { archived: false, isEnabled: true }) {
        id
        token
        metadata {
          title
        }
        config {
          superfluidToken
          proposalType
        }
      }
    }
  }
`;

const STREAMS_QUERY = gql`
  query streamToPool($receiver: String!, $token: String!) {
    streams(where: { receiver: $receiver, token: $token }) {
      sender {
        id
      }
      currentFlowRate
      createdAtTimestamp
      updatedAtTimestamp
    }
  }
`;

const FLOW_UPDATES_QUERY = gql`
  query flowUpdates(
    $receiver: String!
    $token: String!
    $start: BigInt!
    $end: BigInt!
  ) {
    flowUpdatedEvents(
      first: 1000
      where: {
        receiver: $receiver
        token: $token
        timestamp_gte: $start
        timestamp_lte: $end
      }
      orderBy: timestamp
      orderDirection: asc
    ) {
      sender {
        id
      }
      flowRate
      timestamp
    }
  }
`;

const transferAbi = parseAbi([
  "event Transfer(address indexed from,address indexed to,uint256 value)",
]);

const toLower = (addr?: string | null) => addr?.toLowerCase() ?? "";
const isValidAddr = (addr?: string | null) =>
  typeof addr === "string" && addr.toLowerCase().startsWith("0x");
const safeStringify = (value: unknown) => {
  try {
    return JSON.stringify(value, (_key, val) =>
      typeof val === "bigint" ? val.toString() : val,
    );
  } catch (err) {
    console.warn("[superfluid-stack] safeStringify failed", err);
    return "[]";
  }
};
const normalizeForPinata = <T>(payload: T): T => {
  try {
    return JSON.parse(
      JSON.stringify(payload, (_k, v) =>
        typeof v === "bigint" ? v.toString() : v,
      ),
    );
  } catch (error) {
    console.warn("[superfluid-stack] normalizeForPinata failed", error);
    return payload;
  }
};
const NOTION_DB_ID = process.env.NOTION_DB_ID;
const NOTION_TOKEN = process.env.NOTION_TOKEN;
const notionClient =
  NOTION_DB_ID && NOTION_TOKEN ?
    new NotionClient({ auth: NOTION_TOKEN })
  : null;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const buildWalletCsv = (
  entries: {
    address: string;
    fundPoints: number;
    streamPoints: number;
    bonusPoints: number;
    communityPoints: number;
    targetPoints: number;
  }[],
) => {
  const header = [
    "Wallet",
    "Total Pts",
    "Fund Pts",
    "Stream Pts",
    "Bonus Pts",
    "Community Pts",
  ];
  const rows = entries.map((e) =>
    [
      e.address,
      e.targetPoints,
      e.fundPoints,
      e.streamPoints,
      e.bonusPoints,
      e.communityPoints,
    ].join(","),
  );
  return [header.join(","), ...rows].join("\n");
};
const notionQueryDb = async (
  body: Record<string, any>,
): Promise<any | null> => {
  if (!notionClient || !NOTION_DB_ID) return null;
  try {
    // Confirm DB exists/reachable
    return await notionClient.request({
      path: `databases/${NOTION_DB_ID}/query`,
      method: "post",
      body,
    });
  } catch (error) {
    console.error("[superfluid-stack] notion query failed", error);
    return null;
  }
};

const upsertNotionWallet = async ({
  address,
  fundPoints,
  streamPoints,
  bonusPoints,
  communityPoints,
  totalPoints,
}: {
  address: string;
  fundPoints: number;
  streamPoints: number;
  bonusPoints: number;
  communityPoints: number;
  totalPoints: number;
}): Promise<boolean> => {
  if (!notionClient || !NOTION_DB_ID) return false;
  const normalized = address.toLowerCase();
  const props = {
    Address: { title: [{ text: { content: normalized } }] },
    "Fund Pts": { number: fundPoints },
    "Stream Pts": { number: streamPoints },
    "Bonus Pts": { number: bonusPoints },
    "Community Pts": { number: communityPoints },
    "Total Pts": { number: totalPoints },
  } as Record<string, any>;

  try {
    console.log("[superfluid-stack] notion upsert lookup", {
      address: normalized,
    });
    const existing = await notionQueryDb({
      filter: {
        property: "Address",
        title: { equals: normalized },
      },
    });
    if (existing?.results?.length > 0 && "id" in existing.results[0]) {
      const pageId = existing.results[0].id;
      console.log("[superfluid-stack] notion updating page", {
        pageId,
        address: normalized,
        props,
      });
      await notionClient.pages.update({
        page_id: pageId,
        properties: props,
      });
    } else {
      console.log("[superfluid-stack] notion creating page", {
        address: normalized,
        props,
      });
      await notionClient.pages.create({
        parent: { database_id: NOTION_DB_ID },
        properties: props,
      });
    }
    return true;
  } catch (error) {
    console.error(
      "[superfluid-stack] Failed to upsert Notion wallet points",
      address,
      error,
    );
    return false;
  }
};

const maxTimestamp = 2174965144; // January 1, 2039
const campaignStartMS =
  +(process.env.SUPERFLUID_CAMPAIGN_START_TIMESTAMP || 0) * 1000;
const campaignEndMS =
  +(process.env.SUPERFLUID_CAMPAIGN_END_TIMESTAMP || maxTimestamp) * 1000;

const parseCampaignWindow = () => {
  const start = new Date(campaignStartMS);
  const end = new Date(campaignEndMS);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error("Invalid campaign start/end date format");
  }
  return {
    start: Math.floor(start.getTime() / 1000),
    end: Math.floor(end.getTime() / 1000),
  };
};

const createGraphClient = (url: string) =>
  createClient({
    url,
    exchanges: [fetchExchange],
    requestPolicy: "network-only",
  });

const findBlockNumberAtOrAfter = async (
  client: ReturnType<typeof createPublicClient>,
  targetTimestampSec: number,
): Promise<bigint> => {
  const latest = await client.getBlockNumber();
  let low = 0n;
  let high = latest;
  while (low < high) {
    const mid = low + (high - low) / 2n;
    const block = await client.getBlock({ blockNumber: mid });
    if (Number(block.timestamp) >= targetTimestampSec) {
      high = mid;
    } else {
      low = mid + 1n;
    }
  }
  return high;
};

const findBlockNumberAtOrBefore = async (
  client: ReturnType<typeof createPublicClient>,
  targetTimestampSec: number,
): Promise<bigint> => {
  const latest = await client.getBlockNumber();
  let low = 0n;
  let high = latest;
  while (low < high) {
    const mid = low + (high - low + 1n) / 2n;
    const block = await client.getBlock({ blockNumber: mid });
    if (Number(block.timestamp) <= targetTimestampSec) {
      low = mid;
    } else {
      high = mid - 1n;
    }
  }
  return low;
};

const creationBlockCache = new Map<string, bigint | null>();
let creationBlockCacheDirty = false;
const PINATA_CREATION_CACHE_NAME =
  process.env.SUPERFLUID_BLOCK_CACHE_NAME ?? "superfluid-creation-blocks";
const PINATA_TRANSFER_CACHE_NAME =
  process.env.SUPERFLUID_TRANSFER_CACHE_NAME ?? "superfluid-transfer-logs";
const IPFS_GATEWAY = "https://superfluid-campaign-cache.mypinata.cloud";
const PINATA_JWT = process.env.PINATA_JWT;
const PINATA_KEY = process.env.PINATA_KEY;
const PINATA_SECRET = process.env.PINATA_SECRET;
const pinataClient =
  PINATA_JWT || (PINATA_KEY && PINATA_SECRET) ?
    (() => {
      try {
        return new pinataSDK({
          pinataJWTKey: PINATA_JWT,
          pinataApiKey: PINATA_KEY,
          pinataSecretApiKey: PINATA_SECRET,
        });
      } catch (error) {
        console.warn("[superfluid-stack] failed to init pinata SDK", error);
        return null;
      }
    })()
  : null;
const CAN_WRITE_PINATA = Boolean(pinataClient);
const CAN_READ_IPFS = Boolean(IPFS_GATEWAY);
let latestCreationBlockCacheCid: string | null =
  process.env.SUPERFLUID_BLOCK_CACHE_CID ?? null;
let latestTransferLogCacheCid: string | null =
  process.env.SUPERFLUID_TRANSFER_CACHE_CID ?? null;
type TransferLogCacheEntry = {
  startBlock: bigint;
  endBlock: bigint;
  logs: any[];
};
const transferLogCache = new Map<string, TransferLogCacheEntry>();
let transferLogCacheDirty = false;

const ensureLatestPinataCacheCid = async (): Promise<string | null> => {
  if (latestCreationBlockCacheCid) return latestCreationBlockCacheCid;
  if (!CAN_WRITE_PINATA) return null;
  try {
    const data = await pinataClient?.pinList({
      status: "pinned",
      metadata: { name: PINATA_CREATION_CACHE_NAME, keyvalues: {} },
      pageLimit: 1,
      pageOffset: 0,
    });
    const cid = data?.rows?.[0]?.ipfs_pin_hash;
    if (cid) {
      latestCreationBlockCacheCid = cid;
      console.log("[superfluid-stack] loaded latest cache CID from pinata", {
        cid,
      });
      return cid;
    }
    return null;
  } catch (error) {
    console.warn("[superfluid-stack] pinata pinList error", error);
    return null;
  }
};

const ensureLatestTransferCacheCid = async (): Promise<string | null> => {
  if (latestTransferLogCacheCid) return latestTransferLogCacheCid;
  if (!CAN_WRITE_PINATA) return null;
  try {
    const data = await pinataClient?.pinList({
      status: "pinned",
      metadata: { name: PINATA_TRANSFER_CACHE_NAME, keyvalues: {} },
      pageLimit: 1,
      pageOffset: 0,
    });
    const cid = data?.rows?.[0]?.ipfs_pin_hash;
    if (cid) {
      latestTransferLogCacheCid = cid;
      console.log(
        "[superfluid-stack] loaded latest transfer cache CID from pinata",
        {
          cid,
        },
      );
      return cid;
    }
    return null;
  } catch (error) {
    console.warn(
      "[superfluid-stack] pinata pinList error (transfer cache)",
      error,
    );
    return null;
  }
};

const fetchIpfsJson = async (
  cid: string,
): Promise<{ entries?: Record<string, string | null> } | null> => {
  if (!CAN_READ_IPFS || !cid) return null;
  try {
    const gateway =
      IPFS_GATEWAY?.replace(/\/$/, "") ?? "https://gateway.pinata.cloud";
    const url = `${gateway}/ipfs/${cid}`;
    const res = await fetch(url, { method: "GET" });
    if (!res.ok) {
      console.warn("[superfluid-stack] IPFS fetch failed", {
        cid,
        status: res.status,
        statusText: res.statusText,
      });
      return null;
    }
    return (await res.json()) as any;
  } catch (error) {
    console.warn("[superfluid-stack] IPFS fetch error", { cid, error });
    return null;
  }
};

const hydrateCreationBlockCacheFromIpfs = async () => {
  if (creationBlockCache.size > 0) return;
  if (!latestCreationBlockCacheCid) {
    await ensureLatestPinataCacheCid();
  }
  if (!latestCreationBlockCacheCid) return;
  const remote = await fetchIpfsJson(latestCreationBlockCacheCid);
  if (!remote?.entries || typeof remote.entries !== "object") return;
  console.log("[superfluid-stack] hydrating creation block cache from IPFS", {
    cid: latestCreationBlockCacheCid,
    entries: Object.keys(remote.entries).length,
  });
  for (const [addr, block] of Object.entries(remote.entries)) {
    if (typeof addr !== "string") continue;
    if (block === null) {
      creationBlockCache.set(addr.toLowerCase(), null);
    } else if (typeof block === "string" || typeof block === "number") {
      try {
        creationBlockCache.set(addr.toLowerCase(), BigInt(block));
      } catch {
        /* ignore malformed */
      }
    }
  }
};

const hydrateTransferLogCacheFromIpfs = async () => {
  if (transferLogCache.size > 0) return;
  if (!latestTransferLogCacheCid) {
    await ensureLatestTransferCacheCid();
  }
  if (!latestTransferLogCacheCid) return;
  const remote = await fetchIpfsJson(latestTransferLogCacheCid);
  const entries =
    remote && typeof remote === "object" && "entries" in remote ?
      (remote as any).entries
    : null;
  if (!entries || typeof entries !== "object") return;
  console.log("[superfluid-stack] hydrating transfer log cache from IPFS", {
    cid: latestTransferLogCacheCid,
    entries: Object.keys(entries).length,
  });
  for (const [key, value] of Object.entries(entries)) {
    if (
      !value ||
      typeof value !== "object" ||
      !("startBlock" in value) ||
      !("endBlock" in value) ||
      !("logs" in value)
    ) {
      continue;
    }
    try {
      transferLogCache.set(key, {
        startBlock: BigInt((value as any).startBlock),
        endBlock: BigInt((value as any).endBlock),
        logs: Array.isArray((value as any).logs) ? (value as any).logs : [],
      });
    } catch {
      /* ignore malformed */
    }
  }
};

const pinCreationBlockCacheToIpfs = async (): Promise<string | null> => {
  if (!CAN_WRITE_PINATA || !creationBlockCacheDirty) return null;
  const entries = Object.fromEntries(
    Array.from(creationBlockCache.entries()).map(([addr, block]) => [
      addr,
      block !== null ? block.toString() : null,
    ]),
  );
  const payload = {
    updatedAt: new Date().toISOString(),
    entries,
  };
  try {
    const data = await pinataClient?.pinJSONToIPFS(normalizeForPinata(payload), {
      pinataMetadata: {
        name: PINATA_CREATION_CACHE_NAME,
        keyvalues: { updatedAt: payload.updatedAt },
      } as any,
    });
    if (data?.IpfsHash) {
      latestCreationBlockCacheCid = data.IpfsHash;
      console.log("[superfluid-stack] pinned creation block cache to IPFS", {
        cid: data.IpfsHash,
      });
      return data.IpfsHash;
    }
    return null;
  } catch (error) {
    console.warn("[superfluid-stack] pinata pinJSONToIPFS error", error);
    return null;
  }
};

const persistCreationBlockCache = async (): Promise<string | null> => {
  if (!creationBlockCacheDirty) return null;
  const cid = await pinCreationBlockCacheToIpfs();
  creationBlockCacheDirty = false;
  return cid ?? latestCreationBlockCacheCid;
};

const cacheHydrationPromise = Promise.all([
  hydrateCreationBlockCacheFromIpfs(),
  hydrateTransferLogCacheFromIpfs(),
]).catch((error) => {
  console.warn("[superfluid-stack] cache hydration error", error);
});

const findContractCreationBlock = async ({
  publicClient,
  address,
  searchStart,
  searchEnd,
}: {
  publicClient: ReturnType<typeof createPublicClient>;
  address: Address;
  searchStart?: bigint;
  searchEnd?: bigint;
}): Promise<bigint | null> => {
  const cacheKey = toLower(address);
  if (creationBlockCache.has(cacheKey)) {
    return creationBlockCache.get(cacheKey) ?? null;
  }

  const latestBlock = await publicClient.getBlockNumber();
  const upperBound =
    searchEnd && searchEnd > 0n && searchEnd < latestBlock ?
      searchEnd
    : latestBlock;
  const lowerBound = searchStart && searchStart > 0n ? searchStart : 0n;

  let hasCode = false;
  try {
    const code = await publicClient.getBytecode({
      address,
      blockNumber: upperBound,
    });
    hasCode = Boolean(code && code !== "0x");
  } catch (error) {
    console.warn("[superfluid-stack] creation block upper bound check failed", {
      address,
      upperBound: upperBound.toString(),
      error,
    });
  }
  if (!hasCode) {
    creationBlockCache.set(cacheKey, null);
    creationBlockCacheDirty = true;
    return null;
  }

  let low = lowerBound;
  let high = upperBound;
  let found: bigint | null = null;

  while (low <= high) {
    const mid = low + (high - low) / 2n;
    try {
      const code = await publicClient.getBytecode({
        address,
        blockNumber: mid,
      });
      if (code && code !== "0x") {
        found = mid;
        if (mid === 0n) break;
        high = mid - 1n;
      } else {
        low = mid + 1n;
      }
    } catch (error) {
      console.warn(
        "[superfluid-stack] creation block probe failed, advancing",
        { address, mid: mid.toString(), error },
      );
      low = mid + 1n;
    }
  }

  const creationBlock = found ?? low;
  creationBlockCache.set(cacheKey, creationBlock);
  creationBlockCacheDirty = true;
  return creationBlock;
};

const pinTransferLogCacheToIpfs = async (): Promise<string | null> => {
  if (!CAN_WRITE_PINATA || !transferLogCacheDirty) return null;
  const entries = Object.fromEntries(
    Array.from(transferLogCache.entries()).map(([key, value]) => [
      key,
      {
        startBlock: value.startBlock.toString(),
        endBlock: value.endBlock.toString(),
        logs: value.logs,
      },
    ]),
  );
  const payload = {
    updatedAt: new Date().toISOString(),
    entries,
  };
  try {
    const data = await pinataClient?.pinJSONToIPFS(normalizeForPinata(payload), {
      pinataMetadata: {
        name: PINATA_TRANSFER_CACHE_NAME,
        keyvalues: { updatedAt: payload.updatedAt },
      } as any,
    });
    if (data?.IpfsHash) {
      latestTransferLogCacheCid = data.IpfsHash;
      console.log("[superfluid-stack] pinned transfer log cache to IPFS", {
        cid: data.IpfsHash,
      });
      return data.IpfsHash;
    }
    return null;
  } catch (error) {
    console.warn(
      "[superfluid-stack] pinata pinJSONToIPFS error (transfer)",
      error,
    );
    return null;
  }
};

const persistTransferLogCache = async (): Promise<string | null> => {
  if (!transferLogCacheDirty) return null;
  const cid = await pinTransferLogCacheToIpfs();
  transferLogCacheDirty = false;
  return cid ?? latestTransferLogCacheCid;
};

const parseBlockNumber = (value: any): bigint => {
  try {
    if (typeof value === "bigint") return value;
    if (typeof value === "number") return BigInt(value);
    if (typeof value === "string") return BigInt(value);
    if (value && typeof value === "object" && "toString" in value) {
      return BigInt((value as any).toString());
    }
  } catch {
    /* ignore */
  }
  return 0n;
};

const mergeLogs = (existing: any[], incoming: any[]) => {
  const byKey = new Map<string, any>();
  const add = (log: any) => {
    const tx = (log as any).transactionHash ?? "";
    const idx = (log as any).logIndex ?? (log as any).index ?? "";
    const key = `${String(tx).toLowerCase()}_${String(idx)}`;
    byKey.set(key, log);
  };
  existing.forEach(add);
  incoming.forEach(add);
  return Array.from(byKey.values()).sort((a, b) => {
    const aBlock = parseBlockNumber((a as any).blockNumber);
    const bBlock = parseBlockNumber((b as any).blockNumber);
    if (aBlock === bBlock) {
      const aIdx = Number((a as any).logIndex ?? (a as any).index ?? 0);
      const bIdx = Number((b as any).logIndex ?? (b as any).index ?? 0);
      return aIdx - bIdx;
    }
    return aBlock < bBlock ? -1 : 1;
  });
};

const fetchTransferLogsFromChain = async ({
  publicClient,
  token,
  to,
  fromBlock,
  toBlock,
  maxRange,
}: {
  publicClient: ReturnType<typeof createPublicClient>;
  token: Address;
  to: Address;
  fromBlock: bigint;
  toBlock: bigint;
  maxRange: bigint;
}): Promise<any[]> => {
  const logs: any[] = [];
  const minRange = 200n;
  let endBlock = toBlock;
  const totalRange = endBlock >= fromBlock ? endBlock - fromBlock + 1n : 1n;
  let range = maxRange;
  let start = fromBlock;
  while (start <= endBlock) {
    const latest = await publicClient.getBlockNumber();
    if (start > latest) break;
    const end = start + range;
    const chunkEndPreClamp = end > endBlock ? endBlock : end;
    const chunkEnd = chunkEndPreClamp > latest ? latest : chunkEndPreClamp;
    if (chunkEnd < start) break;
    try {
      console.log("[superfluid-stack] fetchTransferLogs request", {
        token,
        to,
        fromBlock: start.toString(),
        toBlock: chunkEnd.toString(),
      });
      const chunk = await publicClient.getLogs({
        address: token,
        event: transferAbi[0],
        args: { to },
        fromBlock: start,
        toBlock: chunkEnd,
      });
      logs.push(...chunk);
      console.log("[superfluid-stack] fetchTransferLogs page", {
        fromBlock: start.toString(),
        toBlock: chunkEnd.toString(),
        pageSize: chunk.length,
      });
      const processed = chunkEnd - fromBlock + 1n;
      const percent =
        totalRange > 0n ? Number((processed * 100n) / totalRange) : 100;
      console.log("[superfluid-stack] fetchTransferLogs progress", {
        token,
        to,
        processed: processed.toString(),
        total: totalRange.toString(),
        percent,
      });
      if (chunkEnd === toBlock) break;
      start = chunkEnd + 1n;
    } catch (error) {
      const message = String((error as Error)?.message ?? error).toLowerCase();
      const retryable =
        message.includes("range is too large") ||
        message.includes("timed out") ||
        message.includes("timeout") ||
        message.includes("block at number") ||
        message.includes("blocknotfound");
      if (retryable && range > minRange) {
        range = range / 2n;
        if (range < minRange) range = minRange;
        console.warn(
          "[superfluid-stack] fetchTransferLogs reducing range after error",
          { token, to, range: range.toString() },
        );
        const refreshedLatest = await publicClient.getBlockNumber();
        if (refreshedLatest < endBlock) {
          endBlock = refreshedLatest;
          if (start > refreshedLatest) break;
        }
        continue;
      }
      if (retryable) {
        console.warn(
          "[superfluid-stack] fetchTransferLogs retryable error at min range, skipping this chunk",
          {
            range: range.toString(),
            error: message,
            skippedFrom: start.toString(),
            skippedTo: chunkEnd.toString(),
          },
        );
        start = chunkEnd + 1n;
        continue;
      }
      throw error;
    }
  }
  return logs;
};

const fetchTransferLogs = async ({
  publicClient,
  token,
  to,
  fromBlock,
  toBlock,
  maxRange = 10_000n,
}: {
  publicClient: ReturnType<typeof createPublicClient>;
  token: Address;
  to: Address;
  fromBlock: bigint;
  toBlock: bigint;
  maxRange?: bigint;
}): Promise<any[]> => {
  if (fromBlock > toBlock) return [];
  const cacheKey = `${toLower(token)}_${toLower(to)}`;

  const latestBlockForRun = await publicClient.getBlockNumber();
  if (fromBlock > latestBlockForRun) {
    console.warn(
      "[superfluid-stack] fetchTransferLogs start beyond latest, skipping",
      {
        start: fromBlock.toString(),
        latest: latestBlockForRun.toString(),
        cacheKey,
      },
    );
    return [];
  }
  const maxRangeInput = maxRange ?? 10_000n;
  let effectiveToBlock =
    toBlock > latestBlockForRun ? latestBlockForRun : toBlock;
  const cached = transferLogCache.get(cacheKey);
  let logs: any[] = [];
  let needFetchStart = fromBlock;
  if (cached) {
    const cachedStart = cached.startBlock;
    const cachedEnd = cached.endBlock;
    const coversStart = fromBlock >= cachedStart;
    const coversEnd = effectiveToBlock <= cachedEnd;
    // Reuse cached logs for any covered range
    logs = cached.logs.filter((log) => {
      const bn = parseBlockNumber((log as any).blockNumber);
      return bn >= fromBlock && bn <= effectiveToBlock;
    });
    if (!coversStart && cachedStart > 0n && fromBlock < cachedStart) {
      const gapEnd = cachedStart - 1n;
      const gapLogs = await fetchTransferLogsFromChain({
        publicClient,
        token,
        to,
        fromBlock,
        toBlock: gapEnd,
        maxRange: maxRangeInput,
      });
      logs = mergeLogs(logs, gapLogs);
      needFetchStart = cachedStart;
    } else {
      needFetchStart = cachedEnd + 1n;
    }
    if (!coversEnd && effectiveToBlock > cachedEnd) {
      const forwardLogs = await fetchTransferLogsFromChain({
        publicClient,
        token,
        to,
        fromBlock: cachedEnd + 1n,
        toBlock: effectiveToBlock,
        maxRange: maxRangeInput,
      });
      logs = mergeLogs(logs, forwardLogs);
      transferLogCache.set(cacheKey, {
        startBlock: cachedStart < fromBlock ? fromBlock : cachedStart,
        endBlock: effectiveToBlock,
        logs: mergeLogs(cached.logs, forwardLogs),
      });
      transferLogCacheDirty = true;
      return logs;
    }
    return logs;
  }

  const freshLogs = await fetchTransferLogsFromChain({
    publicClient,
    token,
    to,
    fromBlock: needFetchStart,
    toBlock: effectiveToBlock,
    maxRange: maxRangeInput,
  });
  const merged = mergeLogs(logs, freshLogs);
  transferLogCache.set(cacheKey, {
    startBlock: fromBlock,
    endBlock: effectiveToBlock,
    logs: merged,
  });
  transferLogCacheDirty = true;
  console.log("[superfluid-stack] fetchTransferLogs completed", {
    cacheKey,
    count: merged.length,
  });
  console.log("[superfluid-stack] fetchTransferLogs cache payload", {
    cacheKey,
    logs: safeStringify(merged),
  });
  return merged;
};

const getDecimals = async (
  client: ReturnType<typeof createPublicClient>,
  token: Address,
): Promise<number> => {
  try {
    const decimals = await client.readContract({
      address: token,
      abi: erc20ABI,
      functionName: "decimals",
    });
    return Number(decimals);
  } catch (error) {
    console.warn(
      `Failed to fetch decimals for token ${token}, defaulting to 18`,
      error,
    );
    return 18;
  }
};

const getSymbol = async (
  client: ReturnType<typeof createPublicClient>,
  token: Address,
): Promise<string> => {
  try {
    const symbol = await client.readContract({
      address: token,
      abi: erc20ABI,
      functionName: "symbol",
    });
    return typeof symbol === "string" ? symbol : token;
  } catch (error) {
    console.warn(
      `Failed to fetch symbol for token ${token}, falling back to address`,
      error,
    );
    return token;
  }
};

const resolveSuperToken = async (
  client: Client,
  token: Address,
): Promise<{ id: Address; sameAsUnderlying: boolean } | null> => {
  console.log("[superfluid-stack] Resolving super token", { token });
  const result = await client
    .query<{ tokens: SuperTokenResult[] }>(SUPER_TOKEN_QUERY, {
      token: token.toLowerCase(),
    })
    .toPromise();
  if (result.error) {
    throw new Error(
      `Failed to fetch super token for ${token}: ${result.error.message}`,
    );
  }

  const tokens = result.data?.tokens ?? [];
  if (!tokens.length) return null;

  const found: SuperTokenResult =
    tokens.find((t) => toLower(t.id) === toLower(token)) ?? tokens[0];

  return {
    id: found.id,
    sameAsUnderlying: toLower(found.id) === toLower(token),
  };
};

const fetchStreams = async (
  client: Client,
  {
    receiver,
    token,
  }: {
    receiver: Address;
    token: Address;
  },
): Promise<StreamEntry[]> => {
  console.log("[superfluid-stack] Fetching streams", { receiver, token });
  const result = await client
    .query<{ streams: StreamEntry[] }>(STREAMS_QUERY, {
      receiver: receiver.toLowerCase(),
      token: token.toLowerCase(),
    })
    .toPromise();
  if (result.error) {
    throw new Error(
      `Failed to fetch streams for receiver ${receiver} token ${token}: ${result.error.message}`,
    );
  }
  if (!result.data?.streams) return [];
  return result.data.streams;
};

const fetchFlowUpdates = async (
  client: Client,
  {
    receiver,
    token,
    start,
    end,
  }: {
    receiver: Address;
    token: Address;
    start: number;
    end: number;
  },
): Promise<FlowUpdate[]> => {
  console.log("[superfluid-stack] Fetching flow updates", {
    receiver,
    token,
    start,
    end,
  });
  const result = await client
    .query<{ flowUpdatedEvents: any[] }>(FLOW_UPDATES_QUERY, {
      receiver: receiver.toLowerCase(),
      token: token.toLowerCase(),
      start: start.toString(),
      end: end.toString(),
    })
    .toPromise();
  if (result.error) {
    console.error(
      "Failed to fetch flow updates",
      receiver,
      token,
      result.error.message,
    );
    return [];
  }
  return (
    result.data?.flowUpdatedEvents?.map((ev) => ({
      sender:
        typeof ev.sender === "string" ?
          { id: ev.sender as Address }
        : ev.sender,
      flowRate: ev.flowRate,
      timestamp: ev.timestamp,
    })) ?? []
  );
};

const calculateStreamUsdBySender = ({
  flowUpdates,
  tokenDecimals,
  priceUsd,
  windowStart,
  windowEnd,
}: {
  flowUpdates: FlowUpdate[];
  tokenDecimals: number;
  priceUsd: number;
  windowStart: number;
  windowEnd: number;
}): { perSender: Map<string, number>; totalUsd: number } => {
  const nowSec = Math.floor(Date.now() / 1000);
  const effectiveEnd = Math.min(nowSec, windowEnd);
  const updatesBySender = new Map<
    string,
    { timestamp: number; flowRate: bigint }[]
  >();
  for (const update of flowUpdates) {
    const senderId = update.sender?.id;
    if (!senderId) continue;
    const list = updatesBySender.get(senderId) ?? [];
    list.push({
      timestamp: Number(update.timestamp),
      flowRate: BigInt(update.flowRate ?? "0"),
    });
    updatesBySender.set(senderId, list);
  }

  const usdBySender = new Map<string, number>();
  let totalUsd = 0;

  for (const [sender, updates] of updatesBySender.entries()) {
    updates.sort((a, b) => a.timestamp - b.timestamp);
    let lastTs = windowStart;
    let lastRate = 0n;
    let usdTotal = 0;

    for (const upd of updates) {
      const segStart = Math.max(lastTs, windowStart);
      const segEnd = Math.min(upd.timestamp, effectiveEnd);
      if (segStart < segEnd && lastRate > 0n) {
        const duration = BigInt(segEnd - segStart);
        const streamedAmount = lastRate * duration;
        const amount = Number(formatUnits(streamedAmount, tokenDecimals));
        usdTotal += amount * priceUsd;
      }
      lastTs = upd.timestamp;
      lastRate = upd.flowRate;
      if (lastTs >= effectiveEnd) break;
    }

    if (lastTs < effectiveEnd && lastRate > 0n) {
      const duration = BigInt(effectiveEnd - lastTs);
      const streamedAmount = lastRate * duration;
      const amount = Number(formatUnits(streamedAmount, tokenDecimals));
      usdTotal += amount * priceUsd;
    }

    if (usdTotal >= 10) {
      totalUsd += usdTotal;
      if (isValidAddr(sender)) {
        usdBySender.set(sender, usdTotal);
      }
    }
  }

  return { perSender: usdBySender, totalUsd };
};

const accumulateBonusStreams = async ({
  streams,
  tokenDecimals,
  priceUsd,
  windowStart,
  windowEnd,
  bonusTotals,
}: {
  streams: StreamEntry[];
  tokenDecimals: number;
  priceUsd: number;
  windowStart: number;
  windowEnd: number;
  bonusTotals: Map<string, number>;
}) => {
  const nowSec = Math.floor(Date.now() / 1000);
  const effectiveEnd = Math.min(nowSec, windowEnd);
  for (const stream of streams) {
    const startTs = Math.max(
      windowStart,
      Number(stream.createdAtTimestamp ?? 0),
    );
    const endTs =
      stream.updatedAtTimestamp ?
        Math.min(Number(stream.updatedAtTimestamp), effectiveEnd)
      : effectiveEnd;
    if (startTs >= endTs) continue;
    const flowRate = BigInt(stream.currentFlowRate ?? "0");
    if (flowRate <= 0n) continue;
    const duration = BigInt(endTs - startTs);
    const streamedAmount = flowRate * duration;
    const amount = Number(formatUnits(streamedAmount, tokenDecimals));
    const usd = amount * priceUsd;
    if (usd < 10) continue;
    const key = toLower(stream.sender.id);
    const prev = bonusTotals.get(key) ?? 0;
    bonusTotals.set(key, prev + usd * 5);
  }
};

const accumulateFundingPoints = async ({
  publicClient,
  poolAddress,
  token,
  fromBlock,
  toBlock,
  tokenDecimals,
  priceUsd,
  userTotals,
}: {
  publicClient: ReturnType<typeof createPublicClient>;
  poolAddress: Address;
  token: Address;
  fromBlock: bigint;
  toBlock: bigint;
  tokenDecimals: number;
  priceUsd: number;
  userTotals: Map<string, { fundUsd: number; streamUsd: number }>;
}) => {
  if (fromBlock > toBlock) return;
  let logs: any[] = [];
  try {
    logs = await fetchTransferLogs({
      publicClient,
      token,
      to: poolAddress,
      fromBlock,
      toBlock,
    });
  } catch (error) {
    throw new Error(
      `Failed to fetch transfer logs for ${token} on ${poolAddress}: ${String(error)}`,
    );
  }

  for (const log of logs) {
    const value = "args" in log ? (log as any).args?.value : null;
    const from = "args" in log ? (log as any).args?.from : null;
    if (!value || !from || !isValidAddr(from)) continue;
    const amount = Number(formatUnits(value as bigint, tokenDecimals));
    const usd = amount * priceUsd;
    if (usd < 10) continue;
    const key = toLower(from);
    const prev = userTotals.get(key) ?? { fundUsd: 0, streamUsd: 0 };
    userTotals.set(key, { ...prev, fundUsd: prev.fundUsd + usd });
  }
};

const computeFundUsdToPool = async ({
  publicClient,
  poolAddress,
  token,
  fromBlock,
  toBlock,
  tokenDecimals,
  priceUsd,
}: {
  publicClient: ReturnType<typeof createPublicClient>;
  poolAddress: Address;
  token: Address;
  fromBlock: bigint;
  toBlock: bigint;
  tokenDecimals: number;
  priceUsd: number;
}): Promise<number> => {
  if (fromBlock > toBlock) return 0;
  let logs: any[] = [];
  try {
    logs = await fetchTransferLogs({
      publicClient,
      token,
      to: poolAddress,
      fromBlock,
      toBlock,
    });
  } catch (error) {
    console.error(
      "Failed to fetch pool transfer logs",
      token,
      poolAddress,
      error,
    );
    return 0;
  }

  return logs.reduce((acc, log) => {
    const value = "args" in log ? (log as any).args?.value : null;
    if (!value) return acc;
    const amount = Number(formatUnits(value as bigint, tokenDecimals));
    const usd = amount * priceUsd;
    return usd >= 10 ? acc + usd : acc;
  }, 0);
};

const accumulateBonusFunding = async ({
  publicClient,
  target,
  token,
  fromBlock,
  toBlock,
  tokenDecimals,
  priceUsd,
  bonusTotals,
}: {
  publicClient: ReturnType<typeof createPublicClient>;
  target: Address;
  token: Address;
  fromBlock: bigint;
  toBlock: bigint;
  tokenDecimals: number;
  priceUsd: number;
  bonusTotals: Map<string, number>;
}) => {
  if (fromBlock > toBlock) return;
  let logs: any[] = [];
  try {
    logs = await fetchTransferLogs({
      publicClient,
      token,
      to: target,
      fromBlock,
      toBlock,
    });
  } catch (error) {
    console.error("Failed to fetch bonus transfer logs", token, target, error);
    return;
  }

  for (const log of logs) {
    const value = "args" in log ? (log as any).args?.value : null;
    const from = "args" in log ? (log as any).args?.from : null;
    if (!value || !from || !isValidAddr(from)) continue;
    const amount = Number(formatUnits(value as bigint, tokenDecimals));
    const usd = amount * priceUsd;
    if (usd < 10) continue;
    const key = toLower(from);
    const prev = bonusTotals.get(key) ?? 0;
    bonusTotals.set(key, prev + usd * 5); // 5 points per $
  }
};

const processChain = async ({
  chainId,
  windowStart,
  windowEnd,
  campaignStart,
  campaignEnd,
}: {
  chainId: ChainId;
  windowStart: number;
  windowEnd: number;
  campaignStart: number;
  campaignEnd: number;
}): Promise<{
  totals: Map<string, { fundUsd: number; streamUsd: number }>;
  missingPrices: { address: Address; symbol: string }[];
  bonusPoints: Map<string, number>;
  communityPoints: Map<string, number>;
  blockBounds: { startBlock: bigint; endBlock: bigint };
  debug: {
    poolsProcessed: number;
    flowUpdateCount: number;
    bonusWallets: number;
    communityCount: number;
  };
  nativePools: { poolAddress: Address; token: Address }[];
  processedCommunities: ProcessedCommunity[];
}> => {
  const chainConfig = chainConfigMap[chainId];
  if (!chainConfig?.subgraphUrl || !chainConfig?.rpcUrl) {
    throw new Error(`Missing config for chain ${chainId}`);
  }
  const superfluidSubgraphUrl =
    chainConfig.publishedSuperfluidSubgraphUrl ??
    chainConfig.superfluidSubgraphUrl;
  if (!superfluidSubgraphUrl) {
    throw new Error(`Missing superfluid subgraph for chain ${chainId}`);
  }

  const urqlClient = createGraphClient(
    chainConfig.publishedSubgraphUrl ?? chainConfig.subgraphUrl,
  );
  const superfluidClient = createGraphClient(superfluidSubgraphUrl);
  const publicClient = createPublicClient({
    chain: getViemChain(chainId),
    transport: http(chainConfig.rpcUrl),
  });
  const superTokenCache = new Map<
    string,
    { id: Address; sameAsUnderlying: boolean }
  >();
  const decimalsCache = new Map<string, number>();

  const getCachedSuperToken = async (token: Address) => {
    const key = toLower(token);
    const cached = superTokenCache.get(key);
    if (cached) return cached;
    const resolved = await resolveSuperToken(superfluidClient, token);
    if (resolved) {
      superTokenCache.set(key, resolved);
    }
    return resolved;
  };

  const getCachedDecimals = async (token: Address) => {
    const key = toLower(token);
    if (decimalsCache.has(key)) return decimalsCache.get(key) as number;
    const decimals = await getDecimals(publicClient, token);
    decimalsCache.set(key, decimals);
    return decimals;
  };

  const userTotals = new Map<string, { fundUsd: number; streamUsd: number }>();
  const missingPrices: { address: Address; symbol: string }[] = [];
  const bonusPoints = new Map<string, number>();

  const manualBounds = MANUAL_BLOCK_BOUNDS[chainId];
  const manualMatchesWindow =
    MANUAL_BOUNDS_WINDOW.startTimestamp === campaignStart &&
    MANUAL_BOUNDS_WINDOW.endTimestamp === campaignEnd;
  let [startBlock, endBlock] = await Promise.all([
    manualMatchesWindow && manualBounds?.startBlock ?
      manualBounds.startBlock
    : findBlockNumberAtOrAfter(publicClient, windowStart),
    manualMatchesWindow && manualBounds?.endBlock ?
      manualBounds.endBlock
    : findBlockNumberAtOrBefore(publicClient, windowEnd),
  ]);
  const latestBlock = await publicClient.getBlockNumber();
  if (endBlock > latestBlock) endBlock = latestBlock;
  if (startBlock > latestBlock) startBlock = latestBlock;

  console.log("[superfluid-stack] Fetching pools", { chainId });
  const poolsResult = await urqlClient
    .query<{ cvstrategies: Strategy[] }>(SUPERFLUID_POOLS_QUERY, {})
    .toPromise();
  if (poolsResult.error) {
    throw new Error(
      `Failed to fetch pools for chain ${chainId}: ${poolsResult.error.message}`,
    );
  }
  if (!poolsResult.data) {
    throw new Error(`Missing pool data for chain ${chainId}`);
  }
  const pools = poolsResult.data.cvstrategies ?? [];

  // Community mapping
  console.log("[superfluid-stack] Fetching communities", { chainId });
  const communitiesResult = await urqlClient
    .query<{
      registryCommunities: {
        id: string;
        communityName?: string | null;
        members: { memberAddress: string; stakedTokens: string }[];
        strategies: {
          id: string;
          token: string;
          metadata?: { title?: string | null } | null;
          config: {
            superfluidToken?: string | null;
            proposalType?: string | null;
          };
        }[];
      }[];
    }>(COMMUNITY_QUERY, {})
    .toPromise();
  if (communitiesResult.error) {
    throw new Error(
      `Failed to fetch communities for chain ${chainId}: ${communitiesResult.error.message}`,
    );
  }
  const communityByPool = new Map<Address, CommunityInfo>();
  for (const comm of communitiesResult.data?.registryCommunities ?? []) {
    const members =
      comm.members?.map((m) => ({
        memberAddress: m.memberAddress as Address,
        stakedTokens: BigInt(m.stakedTokens ?? "0"),
      })) ?? [];
    const poolsForComm =
      comm.strategies?.map((s) => ({
        poolAddress: s.id as Address,
        token: s.token as Address,
        title: s.metadata?.title ?? null,
        superfluidToken: s.config?.superfluidToken as
          | Address
          | undefined
          | null,
      })) ?? [];
    const info: CommunityInfo = {
      id: comm.id,
      communityName: comm.communityName,
      members,
      pools: poolsForComm,
    };
    for (const p of poolsForComm) {
      communityByPool.set(p.poolAddress, info);
    }
  }

  const communityTotals = new Map<
    string,
    { fundUsd: number; streamUsd: number; members: CommunityInfo["members"] }
  >();
  const processedCommunities = new Map<
    string,
    {
      communityId: string;
      communityName?: string | null;
      pools: {
        poolAddress: string;
        token: string;
        superfluidToken?: string | null;
        title?: string | null;
      }[];
    }
  >();

  const nativePools: { poolAddress: Address; token: Address }[] = [];
  let poolsProcessed = 0;
  let flowUpdateCount = 0;

  for (const pool of pools) {
    poolsProcessed++;
    const poolAddress = pool.id;
    const underlyingToken = pool.token;
    const poolTitle = pool.metadata?.title ?? null;
    if (pool.config?.proposalType === "0") {
      console.warn(
        `Skipping signaling pool ${poolAddress} on ${chainId} (proposalType=0)`,
      );
      continue;
    }
    const symbol = await getSymbol(publicClient, underlyingToken);
    let priceUsd: number;
    try {
      priceUsd = await getTokenUsdPrice({
        chainId: Number(chainId),
        address: underlyingToken,
        symbol,
      });
    } catch (error) {
      missingPrices.push({ address: underlyingToken, symbol });
      continue;
    }

    const superToken = await getCachedSuperToken(underlyingToken);
    if (!superToken) {
      console.warn(
        `Super token not found for ${underlyingToken} on ${chainId}, skipping`,
      );
      continue;
    }
    if (superToken.sameAsUnderlying) {
      nativePools.push({ poolAddress, token: underlyingToken });
    }

    const hasConfiguredSuperToken = Boolean(pool.config?.superfluidToken);
    if (!hasConfiguredSuperToken && !superToken.sameAsUnderlying) {
      console.warn(
        `Skipping pool ${poolAddress} on ${chainId}: no superfluid token configured and token is not native super token`,
      );
      continue;
    }

    const allowStreams = hasConfiguredSuperToken || superToken.sameAsUnderlying;
    const superfluidTokenAddress =
      allowStreams ?
        (pool.config?.superfluidToken as Address | null | undefined) ??
        superToken.id
      : null;

    const superTokenDecimals =
      superfluidTokenAddress ?
        await getCachedDecimals(superfluidTokenAddress)
      : null;

    let tokenDecimals: number | null = null;
    if (superToken.sameAsUnderlying) {
      tokenDecimals = await getCachedDecimals(underlyingToken);
    }

    const creationBlock = await findContractCreationBlock({
      publicClient,
      address: poolAddress,
      searchStart: startBlock,
      searchEnd: endBlock,
    });
    const poolStartBlock =
      creationBlock && creationBlock > startBlock ? creationBlock : startBlock;
    if (poolStartBlock > endBlock) {
      console.warn(
        `Skipping pool ${poolAddress} on ${chainId}: created after window`,
        {
          creationBlock: creationBlock?.toString(),
          windowEnd: endBlock.toString(),
        },
      );
      continue;
    }

    if (superToken.sameAsUnderlying) {
      await accumulateFundingPoints({
        publicClient,
        poolAddress,
        token: underlyingToken,
        fromBlock: poolStartBlock,
        toBlock: endBlock,
        tokenDecimals: tokenDecimals as number,
        priceUsd,
        userTotals,
      });
    }

    let streamUsdTotal = 0;
    if (allowStreams && superTokenDecimals !== null) {
      const flowUpdates = await fetchFlowUpdates(superfluidClient, {
        receiver: poolAddress,
        token: superfluidTokenAddress as Address,
        start: windowStart,
        end: windowEnd,
      });
      flowUpdateCount += flowUpdates.length;
      const { perSender: streamUsdBySender, totalUsd } =
        calculateStreamUsdBySender({
          flowUpdates,
          tokenDecimals: superTokenDecimals,
          priceUsd,
          windowStart,
          windowEnd,
        });
      streamUsdTotal = totalUsd;
      for (const [sender, usd] of streamUsdBySender.entries()) {
        if (usd < 10) continue;
        const key = toLower(sender);
        const prev = userTotals.get(key) ?? { fundUsd: 0, streamUsd: 0 };
        userTotals.set(key, { ...prev, streamUsd: prev.streamUsd + usd });
      }
    }

    const community = communityByPool.get(poolAddress);
    if (community) {
      const entry = communityTotals.get(community.id) ?? {
        fundUsd: 0,
        streamUsd: 0,
        members: community.members,
      };
      if (superToken.sameAsUnderlying) {
        const fundUsd = await computeFundUsdToPool({
          publicClient,
          poolAddress,
          token: underlyingToken,
          fromBlock: poolStartBlock,
          toBlock: endBlock,
          tokenDecimals: tokenDecimals as number,
          priceUsd,
        });
        entry.fundUsd += fundUsd;
      }
      entry.streamUsd += streamUsdTotal;
      communityTotals.set(community.id, entry);

      const processed = processedCommunities.get(community.id) ?? {
        communityId: community.id,
        communityName: community.communityName,
        pools: [],
      };
      processed.pools.push({
        poolAddress: toLower(poolAddress),
        token: toLower(underlyingToken),
        superfluidToken:
          superfluidTokenAddress ? toLower(superfluidTokenAddress) : undefined,
        title: poolTitle,
      });
      processedCommunities.set(community.id, processed);
    }

    // Base bonus: transfers/streams to specified community address (any token)
    if (chainId === 8453) {
      // transfers
      await accumulateBonusFunding({
        publicClient,
        target: BASE_BONUS_COMMUNITY,
        token: underlyingToken,
        fromBlock: startBlock,
        toBlock: endBlock,
        tokenDecimals: tokenDecimals ?? superTokenDecimals ?? 18,
        priceUsd,
        bonusTotals: bonusPoints,
      });
      // streams
      if (
        allowStreams &&
        superTokenDecimals !== null &&
        superfluidTokenAddress
      ) {
        const bonusFlowUpdates = await fetchFlowUpdates(superfluidClient, {
          receiver: BASE_BONUS_COMMUNITY,
          token: superfluidTokenAddress,
          start: windowStart,
          end: windowEnd,
        });
        const { perSender: bonusStreamUsd } = calculateStreamUsdBySender({
          flowUpdates: bonusFlowUpdates,
          tokenDecimals: superTokenDecimals,
          priceUsd,
          windowStart,
          windowEnd,
        });
        for (const [sender, usd] of bonusStreamUsd.entries()) {
          if (usd < 10) continue;
          const prev = bonusPoints.get(toLower(sender)) ?? 0;
          bonusPoints.set(toLower(sender), prev + usd * 5);
        }
      }
    }
  }

  // Split community totals to members
  const communityPoints = new Map<string, number>();
  for (const entry of communityTotals.values()) {
    const totalUsd = entry.fundUsd + entry.streamUsd;
    if (totalUsd < 10) continue;
    const totalStake = entry.members.reduce(
      (acc, m) => acc + m.stakedTokens,
      0n,
    );
    if (totalStake === 0n) continue;
    for (const member of entry.members) {
      if (!isValidAddr(member.memberAddress)) continue;
      const share = Number(member.stakedTokens) / Number(totalStake);
      const points = totalUsd * share;
      if (points <= 0) continue;
      const key = toLower(member.memberAddress);
      const prev = communityPoints.get(key) ?? 0;
      communityPoints.set(key, prev + points);
    }
  }

  return {
    totals: userTotals,
    missingPrices,
    bonusPoints,
    communityPoints,
    blockBounds: { startBlock, endBlock },
    debug: {
      poolsProcessed,
      flowUpdateCount,
      bonusWallets: bonusPoints.size,
      communityCount: communityTotals.size,
    },
    nativePools,
    processedCommunities: Array.from(processedCommunities.values()),
  };
};

export async function GET(req: Request) {
  const apiKey = req.headers.get("Authorization");
  if (apiKey !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await cacheHydrationPromise;

  const flushCaches = async () => {
    const [creationPin, transferPin] = await Promise.all([
      persistCreationBlockCache(),
      persistTransferLogCache(),
    ]);
    return {
      creationBlockCacheCid: creationPin ?? latestCreationBlockCacheCid ?? null,
      transferLogCacheCid: transferPin ?? latestTransferLogCacheCid ?? null,
    };
  };
  let responseCreationCid: string | null = null;
  let responseTransferCid: string | null = null;

  try {
    const { start, end } = parseCampaignWindow();
    const totals = new Map<string, { fundUsd: number; streamUsd: number }>();
    const bonusPointsByWallet = new Map<string, number>();
    const communityPointsByWallet = new Map<string, number>();
    const chainDebug: {
      chainId: ChainId;
      poolsProcessed: number;
      flowUpdateCount: number;
      bonusWallets: number;
      communityCount: number;
    }[] = [];
    const missingPriceEntries: {
      address: Address;
      symbol: string;
      chainId: ChainId;
    }[] = [];
    const manualBoundsByChain: Record<
      string,
      { startBlock: string; endBlock: string }
    > = {};
    const nativePoolsByChain: Record<
      string,
      { poolAddress: Address; token: Address }[]
    > = {};
    const communitiesByChain: Record<string, ProcessedCommunity[]> = {};

    for (const chainId of TARGET_CHAINS) {
      const {
        totals: chainTotals,
        missingPrices,
        bonusPoints,
        communityPoints,
        blockBounds,
        nativePools,
        debug,
        processedCommunities,
      } = await processChain({
        chainId,
        windowStart: start,
        windowEnd: end,
        campaignStart: start,
        campaignEnd: end,
      });
      for (const [address, value] of chainTotals.entries()) {
        const prev = totals.get(address) ?? { fundUsd: 0, streamUsd: 0 };
        totals.set(address, {
          fundUsd: prev.fundUsd + value.fundUsd,
          streamUsd: prev.streamUsd + value.streamUsd,
        });
      }
      for (const miss of missingPrices) {
        missingPriceEntries.push({ ...miss, chainId });
      }
      for (const [addr, pts] of bonusPoints.entries()) {
        const key = toLower(addr);
        bonusPointsByWallet.set(key, (bonusPointsByWallet.get(key) ?? 0) + pts);
      }
      for (const [addr, pts] of communityPoints.entries()) {
        const key = toLower(addr);
        communityPointsByWallet.set(
          key,
          (communityPointsByWallet.get(key) ?? 0) + pts,
        );
      }
      manualBoundsByChain[String(chainId)] = {
        startBlock: blockBounds.startBlock.toString(),
        endBlock: blockBounds.endBlock.toString(),
      };
      nativePoolsByChain[String(chainId)] = nativePools;
      chainDebug.push({ chainId, ...debug });
      communitiesByChain[String(chainId)] = processedCommunities.map(
        (c: ProcessedCommunity) => ({
          ...c,
          communityId: c.communityId.toLowerCase(),
          communityName: c.communityName,
          pools: c.pools.map((p: ProcessedCommunity["pools"][number]) => ({
            ...p,
            poolAddress: p.poolAddress.toLowerCase(),
            token: p.token.toLowerCase(),
            superfluidToken: p.superfluidToken?.toLowerCase() ?? undefined,
          })),
        }),
      );
    }

    const manualBounds = {
      ...manualBoundsByChain,
      startTimestamp: start,
      endTimestamp: end,
    };
    // Log computed bounds so they can be hardcoded in MANUAL_BLOCK_BOUNDS if desired
    console.log("Computed block bounds by chain", manualBounds);

    const updates: {
      address: string;
      added: number;
      total: number;
      existing: number;
      target: number;
    }[] = [];
    const walletBreakdown: {
      address: string;
      fundUsd: number;
      streamUsd: number;
      fundPoints: number;
      streamPoints: number;
      bonusPoints: number;
      communityPoints: number;
      targetPoints: number;
      existingPoints: number;
      addedPoints: number;
    }[] = [];

    const allAddresses = new Set<string>([
      ...totals.keys(),
      ...bonusPointsByWallet.keys(),
      ...communityPointsByWallet.keys(),
    ]);

    for (const address of allAddresses) {
      const value = totals.get(address) ?? { fundUsd: 0, streamUsd: 0 };
      const fundPoints = value.fundUsd >= 10 ? Math.floor(value.fundUsd) : 0;
      const streamPoints =
        value.streamUsd >= 10 ? Math.floor(value.streamUsd) : 0;
      const bonusPts = Math.floor(bonusPointsByWallet.get(address) ?? 0);
      const communityPts = Math.floor(
        communityPointsByWallet.get(address) ?? 0,
      );
      const targetPoints = fundPoints + streamPoints + bonusPts + communityPts;
      if (targetPoints <= 0) continue;

      const existingRaw = await superfluidStackClient.getPoints(address);
      const existing =
        typeof existingRaw === "number" ? existingRaw
        : Array.isArray(existingRaw) && existingRaw.length > 0 ?
          (existingRaw as any)[0]?.amount ?? 0
        : 0;
      const delta = targetPoints - existing;
      if (delta > 0 && !STACK_DRY_RUN) {
        await superfluidStackClient.pointsClient.addPoints({
          address,
          points: delta,
        });
      }
      updates.push({
        address,
        added: delta > 0 ? delta : 0,
        total: targetPoints,
        existing,
        target: targetPoints,
      });
      walletBreakdown.push({
        address,
        fundUsd: value.fundUsd,
        streamUsd: value.streamUsd,
        fundPoints,
        streamPoints,
        bonusPoints: bonusPts,
        communityPoints: communityPts,
        targetPoints,
        existingPoints: existing,
        addedPoints: delta > 0 ? delta : 0,
      });
    }

    // Export as CSV (Notion sync runs when configured; CSV remains fallback)
    const walletBreakdownCsv = buildWalletCsv(walletBreakdown);

    let notionSync = {
      attempted: false,
      success: false,
      processed: 0,
      failed: 0,
    };

    if (notionClient && NOTION_DB_ID) {
      notionSync.attempted = true;
      console.log("[superfluid-stack] Syncing wallet points to Notion", {
        count: walletBreakdown.length,
      });
      const batchSize = 3;
      const delayMs = 350;
      try {
        for (let i = 0; i < walletBreakdown.length; i += batchSize) {
          const batch = walletBreakdown.slice(i, i + batchSize);
          const results = await Promise.all(
            batch.map((wallet) =>
              upsertNotionWallet({
                address: wallet.address,
                fundPoints: wallet.fundPoints,
                streamPoints: wallet.streamPoints,
                bonusPoints: wallet.bonusPoints,
                communityPoints: wallet.communityPoints,
                totalPoints: wallet.targetPoints,
              }),
            ),
          );
          results.forEach((ok) => {
            notionSync.processed += 1;
            if (!ok) notionSync.failed += 1;
          });
          if (i + batchSize < walletBreakdown.length) {
            await sleep(delayMs); // Stay under Notion rate limits
          }
        }
      } catch (error) {
        console.error("[superfluid-stack] Notion sync failure", error);
        notionSync.failed += walletBreakdown.length - notionSync.processed;
      }
      notionSync.success = notionSync.failed === 0;
    }

    const pinned = await flushCaches();
    responseCreationCid = pinned.creationBlockCacheCid;
    responseTransferCid = pinned.transferLogCacheCid;

    return NextResponse.json(
      {
        message: "Superfluid stack sync completed",
        updated: updates,
        totals: Object.fromEntries(totals.entries()),
        missingPrices: missingPriceEntries,
        overrideTemplate: missingPriceEntries.reduce(
          (acc, curr) => {
            if (!(curr.symbol in acc)) acc[curr.symbol] = "";
            return acc;
          },
          {} as Record<string, string>,
        ),
        manualBounds,
        nativePoolsByChain,
        communitiesByChain,
        walletBreakdown,
        walletBreakdownCsv,
        notionSync,
        creationBlockCacheCid:
          responseCreationCid ?? latestCreationBlockCacheCid ?? null,
        transferLogCacheCid:
          responseTransferCid ?? latestTransferLogCacheCid ?? null,
        campaignWindow: {
          start,
          end,
          startIso: new Date(start * 1000).toISOString(),
          endIso: new Date(end * 1000).toISOString(),
        },
        dryRun: STACK_DRY_RUN,
        debug: chainDebug,
      },
      { status: 200 },
    );
  } catch (error) {
    const pinned = await flushCaches();
    responseCreationCid = pinned.creationBlockCacheCid;
    responseTransferCid = pinned.transferLogCacheCid;
    console.error("Superfluid stack cron error", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      {
        error: message,
        creationBlockCacheCid:
          responseCreationCid ?? latestCreationBlockCacheCid ?? null,
        transferLogCacheCid:
          responseTransferCid ?? latestTransferLogCacheCid ?? null,
      },
      { status: 500 },
    );
  }
}
