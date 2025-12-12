/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
import { Client as NotionClient } from "@notionhq/client";
import pinataSDK from "@pinata/sdk";
import { NextResponse } from "next/server";
import { Client, createClient, fetchExchange, gql } from "urql";
import { Address, createPublicClient, formatUnits, http, parseAbi } from "viem";
import { chainConfigMap } from "@/configs/chains";
import { getTokenUsdPrice } from "@/services/coingecko";
import {
  STACK_DRY_RUN,
  getSuperfluidStackClient,
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
  streamUsd?: number;
  fundUsd?: number;
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
  query flowUpdates($receiver: String!, $token: String!) {
    flowUpdatedEvents(
      first: 1000
      where: { receiver: $receiver, token: $token }
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
const NOTION_DB_ID_TRIMMED = NOTION_DB_ID?.trim();
const NOTION_DB_ID_NORMALIZED =
  NOTION_DB_ID_TRIMMED?.match(/[0-9a-f]{32}/i)?.[0]?.replace(/-/g, "") ??
  NOTION_DB_ID_TRIMMED;
const NOTION_DATA_SOURCE_ID = process.env.NOTION_DATA_SOURCE_ID?.trim() ?? null;
let notionDataSourceId: string | null = NOTION_DATA_SOURCE_ID;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const buildWalletCsv = (
  entries: {
    address: string;
    fundPoints: number;
    streamPoints: number;
    superfluidActivityPoints: number;
    governanceStakePoints: number;
    farcasterPoints: number;
    totalPoints: number;
  }[],
) => {
  const header = [
    "Wallet",
    "Total Pts",
    "Fund Pts",
    "Stream Pts",
    "Superfluid Activity Pts",
    "Governance Stake Pts",
    "Farcaster Pts",
  ];
  const rows = entries.map((e) =>
    [
      e.address,
      e.totalPoints,
      e.fundPoints,
      e.streamPoints,
      e.superfluidActivityPoints,
      e.governanceStakePoints,
      e.farcasterPoints,
    ].join(","),
  );
  return [header.join(","), ...rows].join("\n");
};

const ensureNotionDataSourceId = async (): Promise<string | null> => {
  if (!notionClient || !NOTION_DB_ID_NORMALIZED) return null;
  if (notionDataSourceId) return notionDataSourceId;
  try {
    const db = await notionClient.databases.retrieve({
      database_id: NOTION_DB_ID_NORMALIZED,
    });
    const dsId = (db as any)?.data_sources?.[0]?.id;
    if (typeof dsId === "string") {
      notionDataSourceId = dsId;
      return notionDataSourceId;
    }
    console.error("[superfluid-stack] No data_sources found on database");
    return null;
  } catch (err) {
    console.error("[superfluid-stack] failed to retrieve Notion database", {
      err,
    });
    return null;
  }
};

let notionChecksumEnsured = false;
const ensureNotionChecksumProperty = async (): Promise<boolean> => {
  if (!notionClient || !NOTION_DB_ID_NORMALIZED) return false;
  if (notionChecksumEnsured) return true;
  try {
    const db = await notionClient.databases.retrieve({
      database_id: NOTION_DB_ID_NORMALIZED,
    });
    const props = (db as any)?.properties ?? {};
    if (props?.Checksum?.type === "rich_text") {
      notionChecksumEnsured = true;
      return true;
    }
    await (notionClient as any).databases.update({
      database_id: NOTION_DB_ID_NORMALIZED,
      properties: {
        Checksum: { rich_text: {} },
      },
    });
    notionChecksumEnsured = true;
    console.log(
      "[superfluid-stack] added Checksum property to Notion database",
      { databaseId: NOTION_DB_ID_NORMALIZED },
    );
    return true;
  } catch (error) {
    console.error("[superfluid-stack] failed to ensure Checksum property", {
      error,
    });
    return false;
  }
};

const notionQueryDb = async (
  body: Record<string, any>,
): Promise<any | null> => {
  if (!notionClient || !NOTION_DB_ID_NORMALIZED) return null;
  try {
    const dataSourceId = await ensureNotionDataSourceId();
    if (!dataSourceId) throw new Error("No Notion data_source_id available");
    console.log("[superfluid-stack] notion query", {
      dataSource: dataSourceId,
      body,
    });
    return await notionClient.dataSources.query({
      data_source_id: dataSourceId,
      ...body,
    });
  } catch (error) {
    const code = (error as any)?.code ?? (error as any)?.status;
    const message = (error as any)?.message ?? "";
    const status = (error as any)?.status ?? (error as any)?.statusCode;
    const bodyText = (error as any)?.body;
    const requestId = (error as any)?.request_id ?? (error as any)?.requestId;
    console.error("[superfluid-stack] notion query failed", {
      code,
      status,
      message,
      body: bodyText,
      requestId,
      path:
        notionDataSourceId ?
          `data_sources/${notionDataSourceId}/query`
        : `databases/${NOTION_DB_ID_NORMALIZED}/query`,
      payload: body,
    });
    if (String(code) === "invalid_request_url") {
      console.error(
        "[superfluid-stack] Disabling Notion sync due to invalid_request_url",
      );
      notionDisabled = true;
    }
    return null;
  }
};

const upsertNotionWallet = async ({
  address,
  fundPoints,
  streamPoints,
  superfluidActivityPoints,
  governanceStakePoints,
  totalPoints,
  farcasterPoints,
}: {
  address: string;
  fundPoints: number;
  streamPoints: number;
  superfluidActivityPoints: number;
  governanceStakePoints: number;
  totalPoints: number;
  farcasterPoints: number;
}): Promise<boolean> => {
  if (!notionClient || !NOTION_DB_ID_NORMALIZED || notionDisabled) return false;
  const checksumReady = await ensureNotionChecksumProperty();
  if (!checksumReady) {
    console.warn(
      "[superfluid-stack] skipping Notion upsert because Checksum column is missing and could not be created",
    );
    return false;
  }
  const normalized = address.toLowerCase();
  const checksum = [
    normalized,
    fundPoints,
    streamPoints,
    superfluidActivityPoints,
    governanceStakePoints,
    farcasterPoints,
    totalPoints,
  ].join("|");
  const props = {
    Wallet: { title: [{ text: { content: normalized } }] },
    "Add Funds": { number: fundPoints },
    "Stream Funds": { number: streamPoints },
    "2x Multiplier": { number: superfluidActivityPoints },
    "Governance Stake": { number: governanceStakePoints },
    Farcaster: { number: farcasterPoints },
    "Total Pts": { number: totalPoints },
    Checksum: { rich_text: [{ text: { content: checksum } }] },
  } as Record<string, any>;

  try {
    console.log("[superfluid-stack] notion upsert lookup", {
      address: normalized,
    });
    let pageId: string | null = null;
    let existingResult: any | null = null;
    try {
      existingResult = await notionQueryDb({
        filter: {
          property: "Wallet",
          title: { equals: normalized },
        },
      });
      if (
        existingResult?.results?.length > 0 &&
        "id" in existingResult.results[0]
      ) {
        pageId = existingResult.results[0].id;
      }
    } catch (err) {
      console.warn("[superfluid-stack] notion lookup failed, will create", {
        address: normalized,
        err,
      });
    }

    if (pageId) {
      const existingChecksum = (existingResult?.results?.[0]?.properties as any)
        ?.Checksum?.rich_text?.[0]?.plain_text;
      if (existingChecksum === checksum) {
        return true; // no changes needed
      }
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
      const dataSourceId = await ensureNotionDataSourceId();
      if (!dataSourceId) {
        throw new Error("No Notion data_source_id available for create");
      }
      console.log("[superfluid-stack] notion creating page", {
        address: normalized,
        props,
      });
      await notionClient.pages.create({
        parent: {
          type: "data_source_id",
          data_source_id: dataSourceId,
        },
        properties: props,
      });
    }
    return true;
  } catch (error) {
    const messageRaw = String((error as any)?.message ?? "");
    const message = messageRaw.toLowerCase();
    const code = (error as any)?.code ?? (error as any)?.status;
    if (
      message.includes("could not find database") ||
      String(code) === "invalid_request_url"
    ) {
      console.error("[superfluid-stack] Notion unreachable, disabling sync");
      notionDisabled = true;
    }
    console.error("[superfluid-stack] Notion upsert error details", {
      code,
      status: (error as any)?.status ?? (error as any)?.statusCode,
      body: (error as any)?.body,
    });
    console.error(
      "[superfluid-stack] Failed to upsert Notion wallet points",
      address,
      error,
    );
    return false;
  }
};

const maxTimestamp = 2177452800; // January 1, 2039
const campaignStartMS =
  +(process.env.SUPERFLUID_CAMPAIGN_START_TIMESTAMP || 0) * 1000;
const campaignEndMS =
  +(process.env.SUPERFLUID_CAMPAIGN_END_TIMESTAMP || maxTimestamp) * 1000;
const CAMPAIGN_VERSION = `${campaignStartMS}-${campaignEndMS}`;

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
export const PINATA_POINTS_SNAPSHOT_NAME = "superfluid-activity-points";
const PINATA_RUN_LOG_NAME = "superfluid-stack-run-logs";
const PINATA_POINTS_SNAPSHOT_CID =
  process.env.SUPERFLUID_POINTS_SNAPSHOT_CID ?? null;
const PINATA_PRICE_CACHE_NAME =
  process.env.SUPERFLUID_PRICE_CACHE_NAME ?? "superfluid-token-prices";
const PINATA_GROUP_ID =
  process.env.PINATA_GROUP_ID ?? "37bf2b9a-5a2e-4049-b138-8b1e180d44a4";
const IPFS_GATEWAY = `https://${process.env.IPFS_GATEWAY}`;
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
const SKIP_IDENTITY_RESOLUTION =
  (process.env.SUPERFLUID_SKIP_IDENTITY_RESOLUTION ?? "").toLowerCase() ===
  "true";
const SHOULD_PIN_RUN_LOGS =
  (process.env.SUPERFLUID_PIN_RUN_LOGS ?? "").toLowerCase() === "true";
const FARCASTER_AUTH_TOKEN = (process.env.FARCASTER_API_KEY ?? "").trim();
let latestCreationBlockCacheCid: string | null =
  process.env.SUPERFLUID_BLOCK_CACHE_CID ?? null;
let latestTransferLogCacheCid: string | null =
  process.env.SUPERFLUID_TRANSFER_CACHE_CID ?? null;
const FARCASTER_GARDENS_USERNAME =
  process.env.FARCASTER_GARDENS_USERNAME ?? "gardens";
let farcasterGardensFid: number | null = null;
type TransferLogCacheEntry = {
  startBlock: bigint;
  endBlock: bigint;
  logs: any[];
};
const transferLogCache = new Map<string, TransferLogCacheEntry>();
let transferLogCacheDirty = false;
let notionDisabled = false;
const FARCASTER_DISABLED = !FARCASTER_AUTH_TOKEN;

if (FARCASTER_DISABLED) {
  console.log(
    "[superfluid-stack] skipping farcaster resolution because FARCASTER_API_KEY is missing",
  );
}
let farcasterUsernameCache = new Map<string, string>();
let ensNameCache = new Map<string, string>();
let ensAvatarCache = new Map<string, string>();
let nativeSuperTokenCache = new Map<string, string>();
let nativeTokenCache = new Map<string, string>();
let latestPointsSnapshotCid: string | null = PINATA_POINTS_SNAPSHOT_CID;
let creationCacheCampaignVersion: string | null = null;
let transferCacheCampaignVersion: string | null = null;
const TOKEN_PRICE_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const tokenPriceCache = new Map<
  string,
  { price: number; fetchedAt: number; symbol: string }
>();
let priceCacheDirty = false;
let latestPriceCacheCid: string | null = null;
const ensLookupFailures = new Set<string>();
let ensCacheDay: string | null = null;
const ensureEnsCacheFresh = () => {
  const today = new Date().toISOString().slice(0, 10);
  if (ensCacheDay !== today) {
    ensCacheDay = today;
    ensNameCache.clear();
    ensAvatarCache.clear();
    ensLookupFailures.clear();
  }
};
const farcasterAuthHeader =
  FARCASTER_AUTH_TOKEN ? `Bearer ${FARCASTER_AUTH_TOKEN}` : null;

const getFarcasterHeaders = () => ({
  Authorization: farcasterAuthHeader ?? "",
});

const fetchGardensFid = async (): Promise<number | null> => {
  if (FARCASTER_DISABLED) {
    console.log("[superfluid-stack] Farcaster disabled: no API key");
    return null;
  }
  if (!farcasterAuthHeader) {
    console.warn("[superfluid-stack] Farcaster auth header missing");
    return null;
  }
  if (farcasterGardensFid) return farcasterGardensFid;
  try {
    const res = await fetch(
      `https://api.farcaster.xyz/v2/user-by-username?username=${encodeURIComponent(FARCASTER_GARDENS_USERNAME)}`,
      {
        headers: getFarcasterHeaders(),
      },
    );
    if (!res.ok) {
      console.warn("[superfluid-stack] farcaster user fetch failed", {
        status: res.status,
        statusText: res.statusText,
      });
      return null;
    }
    const json = await res.json();
    const fid = json?.result?.user?.fid;
    if (typeof fid === "number") {
      farcasterGardensFid = fid;
      return fid;
    }
    return null;
  } catch (error) {
    console.warn("[superfluid-stack] farcaster user fetch error", error);
    return null;
  }
};

const fetchFarcasterFollowerFids = async (
  targetFid: number,
): Promise<number[]> => {
  if (FARCASTER_DISABLED) {
    console.log("[superfluid-stack] Skipping Farcaster followers: disabled");
    return [];
  }
  const fidsSet = new Set<number>();
  let cursor: string | undefined;
  const fetchPage = async () => {
    while (true) {
      const params = new URLSearchParams({
        fid: String(targetFid),
        limit: "150",
      });
      if (cursor) params.set("cursor", cursor);
      const res = await fetch(
        `https://api.farcaster.xyz/v2/followers?${params.toString()}`,
        { headers: getFarcasterHeaders() },
      );
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        console.warn("[superfluid-stack] farcaster followers fetch failed", {
          status: res.status,
          statusText: res.statusText,
          body,
        });
        return false;
      }
      const json = await res.json();
      const users = json?.result?.users ?? [];
      for (const u of users) {
        if (typeof u?.fid === "number") fidsSet.add(u.fid);
      }
      cursor = json?.result?.next?.cursor;
      if (!cursor) return true;
    }
  };

  try {
    await fetchPage();
  } catch (error) {
    console.warn("[superfluid-stack] farcaster followers fetch error", error);
  }
  return Array.from(fidsSet.values());
};

let mainnetClient: ReturnType<typeof createPublicClient> | null = null;
const getMainnetClient = () => {
  if (mainnetClient) return mainnetClient;
  const chainCfg = getViemChain(1 as ChainId);
  mainnetClient = createPublicClient({
    chain: chainCfg,
    transport: http(
      process.env.RPC_URL_MAINNET ?? chainCfg.rpcUrls.default.http[0],
    ),
  });
  return mainnetClient;
};

const fetchEnsIdentityByAddress = async (
  address: string,
): Promise<{ name: string | null; avatar: string | null }> => {
  if (!address || !address.toLowerCase().startsWith("0x")) {
    return { name: null, avatar: null };
  }
  ensureEnsCacheFresh();
  const cachedNameRaw = ensNameCache.get(address);
  const cachedAvatarRaw = ensAvatarCache.get(address);
  const cachedName = cachedNameRaw === "" ? null : cachedNameRaw ?? null;
  const cachedAvatar = cachedAvatarRaw === "" ? null : cachedAvatarRaw ?? null;
  if (cachedName !== null && cachedAvatar !== null) {
    return { name: cachedName, avatar: cachedAvatar };
  }
  try {
    const client = getMainnetClient();
    const name =
      cachedName ?? (await client.getEnsName({ address: address as Address }));
    const ens = typeof name === "string" ? name : null;
    if (ens) {
      ensNameCache.set(address, ens);
    } else {
      console.log("[superfluid-stack] ens not found for address", { address });
      ensNameCache.set(address, "");
    }

    let avatar: string | null = null;
    if (cachedAvatar !== null) {
      avatar = cachedAvatar;
    } else if (ens) {
      avatar = await client.getEnsAvatar({ name: ens });
      if (avatar) {
        ensAvatarCache.set(address, avatar);
      } else {
        console.log("[superfluid-stack] ens avatar not found for name", {
          ens,
        });
        ensAvatarCache.set(address, "");
      }
    }
    return { name: ens, avatar };
  } catch (error) {
    const message = (error as Error)?.message ?? "";
    if (message.includes("reverse")) {
      // Reverse resolver often reverts when unset; ignore quietly after first hit
      ensLookupFailures.add(address);
      ensNameCache.set(address, "");
      ensAvatarCache.set(address, "");
      return { name: null, avatar: null };
    }
    console.warn("[superfluid-stack] ens lookup failed", { address, error });
    ensNameCache.set(address, "");
    ensAvatarCache.set(address, "");
    return { name: null, avatar: null };
  }
};

const fetchFarcasterWalletsForFids = async (
  fids: number[],
): Promise<{
  primary: Set<string>;
  discarded: Set<string>;
  usernames: Map<string, string>;
}> => {
  const wallets = new Set<string>();
  const discarded = new Set<string>();
  const usernames = new Map<string, string>();
  if (FARCASTER_DISABLED || !fids.length) {
    return { primary: wallets, discarded, usernames };
  }
  if (!farcasterAuthHeader) {
    console.warn("[superfluid-stack] Farcaster auth header missing");
    return { primary: wallets, discarded, usernames };
  }
  for (const fid of fids) {
    try {
      const res = await fetch(
        `https://api.farcaster.xyz/v2/user-by-fid?fid=${fid}`,
        { headers: getFarcasterHeaders() },
      );
      if (!res.ok) {
        const body = await res.text();
        console.warn("[superfluid-stack] farcaster single user failed", {
          fid,
          status: res.status,
          statusText: res.statusText,
          body,
        });
        continue;
      }
      const json = await res.json();
      const u = json?.result?.user ?? null;
      const extras = json?.result?.extras ?? null;
      if (!u) continue;
      const collectValid = (list?: string[] | null): string[] => {
        if (!Array.isArray(list)) return [];
        return list
          .filter(
            (candidate) =>
              typeof candidate === "string" &&
              candidate.toLowerCase().startsWith("0x"),
          )
          .map((c) => c.toLowerCase());
      };

      const ethWallets = collectValid(extras?.ethWallets);
      const custody = collectValid(u?.custodyAddress ? [u.custodyAddress] : []);
      const verified = collectValid(u?.verifiedAddresses);
      const verifications = collectValid(u?.verifications);
      const labeled = collectValid(
        Array.isArray(extras?.walletLabels) ?
          extras.walletLabels
            .map((l: any) => l?.address)
            .filter((a: any) => typeof a === "string")
        : [],
      );

      // Priority: ethWallets first element, then custody, then verifiedAddresses, verifications, walletLabels.
      const priorityList = [
        ...ethWallets,
        ...custody,
        ...verified,
        ...verifications,
        ...labeled,
      ];
      const chosen = priorityList[0];
      const others = priorityList.slice(1);

      if (!chosen) {
        console.warn("[superfluid-stack] farcaster user has no addresses", {
          fid: u?.fid,
          displayName: u?.displayName,
          username: u?.username,
        });
        continue;
      }

      wallets.add(chosen);
      if (typeof u?.username === "string") {
        usernames.set(chosen, u.username);
      }
      for (const addr of others) discarded.add(addr);
    } catch (error) {
      console.warn("[superfluid-stack] farcaster single user fetch error", {
        fid,
        error,
      });
    }
  }
  return { primary: wallets, discarded, usernames };
};
const ensureLatestPinataCacheCid = async (): Promise<string | null> => {
  if (latestCreationBlockCacheCid) return latestCreationBlockCacheCid;
  if (!CAN_WRITE_PINATA) return null;
  try {
    const data = await pinataClient?.pinList({
      status: "pinned",
      metadata: {
        name: PINATA_CREATION_CACHE_NAME,
        keyvalues: {
          campaignVersion: { value: CAMPAIGN_VERSION, op: "eq" },
        },
      },
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
    const query = {
      status: "pinned",
      metadata: {
        name: PINATA_TRANSFER_CACHE_NAME,
        keyvalues: {
          campaignVersion: { value: CAMPAIGN_VERSION, op: "eq" },
        },
      },
      pageLimit: 1,
      pageOffset: 0,
    } as any;
    let data = await pinataClient?.pinList(query);
    if (!data || !data.rows || data.rows.length === 0) {
      // fallback to any latest if no matching campaignVersion
      data = await pinataClient?.pinList({
        status: "pinned",
        metadata: { name: PINATA_TRANSFER_CACHE_NAME, keyvalues: {} },
        pageLimit: 1,
        pageOffset: 0,
      } as any);
    }
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
  const campaignVersion = (remote as any)?.campaignVersion;
  if (
    !remote?.entries ||
    typeof remote.entries !== "object" ||
    campaignVersion !== CAMPAIGN_VERSION
  )
    return;
  console.log("[superfluid-stack] hydrating creation block cache from IPFS", {
    cid: latestCreationBlockCacheCid,
    entries: Object.keys(remote.entries).length,
  });
  creationCacheCampaignVersion = campaignVersion ?? null;
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
  const campaignVersion = (remote as any)?.campaignVersion;
  const entries =
    remote && typeof remote === "object" && "entries" in remote ?
      (remote as any).entries
    : null;
  if (!entries || typeof entries !== "object") return;
  console.log("[superfluid-stack] hydrating transfer log cache from IPFS", {
    cid: latestTransferLogCacheCid,
    entries: Object.keys(entries).length,
  });
  transferCacheCampaignVersion = campaignVersion ?? null;
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
    campaignVersion: CAMPAIGN_VERSION,
    entries,
  };
  try {
    const data = await pinataClient?.pinJSONToIPFS(
      normalizeForPinata(payload),
      {
        pinataMetadata: {
          name: PINATA_CREATION_CACHE_NAME,
          keyvalues: {
            updatedAt: payload.updatedAt,
            campaignVersion: CAMPAIGN_VERSION,
          },
        } as any,
        pinataOptions:
          PINATA_GROUP_ID ? ({ groupId: PINATA_GROUP_ID } as any) : undefined,
      },
    );
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
  (async () => {
    const cid =
      latestPriceCacheCid ??
      (await (async () => {
        if (latestPriceCacheCid || !CAN_WRITE_PINATA) return null;
        try {
          const data = await pinataClient?.pinList({
            status: "pinned",
            metadata: { name: PINATA_PRICE_CACHE_NAME },
            pageLimit: 1,
            pageOffset: 0,
          } as any);
          const found = data?.rows?.[0]?.ipfs_pin_hash ?? null;
          if (found) {
            latestPriceCacheCid = found;
            return found;
          }
          return null;
        } catch {
          return null;
        }
      })());
    if (!cid) return;
    const remote = await fetchIpfsJson(cid);
    const entries =
      remote && typeof remote === "object" && "entries" in remote ?
        (remote as any).entries
      : null;
    if (!entries || typeof entries !== "object") return;
    const now = Date.now();
    let hydrated = 0;
    for (const [key, val] of Object.entries(entries)) {
      if (
        !val ||
        typeof val !== "object" ||
        typeof (val as any).price !== "number" ||
        typeof (val as any).fetchedAt !== "number"
      ) {
        continue;
      }
      const fetchedAt = (val as any).fetchedAt;
      if (now - fetchedAt >= TOKEN_PRICE_CACHE_TTL_MS) continue;
      const symbol =
        typeof (val as any).symbol === "string" ? (val as any).symbol : "";
      tokenPriceCache.set(key, {
        price: (val as any).price,
        fetchedAt,
        symbol,
      });
      hydrated++;
    }
    if (hydrated > 0) {
      console.log("[superfluid-stack] hydrated token price cache from IPFS", {
        cid,
        entries: hydrated,
      });
    }
  })(),
]).catch((error) => {
  console.warn("[superfluid-stack] cache hydration error", error);
});

const ensureLatestPointsSnapshotCid = async (): Promise<string | null> => {
  if (latestPointsSnapshotCid) return latestPointsSnapshotCid;
  if (!CAN_WRITE_PINATA) return null;
  try {
    const data = await pinataClient?.pinList({
      status: "pinned",
      metadata: { name: PINATA_POINTS_SNAPSHOT_NAME, keyvalues: {} },
      pageLimit: 1,
      pageOffset: 0,
    });
    const cid = data?.rows?.[0]?.ipfs_pin_hash;
    if (cid) {
      latestPointsSnapshotCid = cid;
      console.log("[superfluid-stack] loaded latest points snapshot CID", {
        cid,
      });
      return cid;
    }
    return null;
  } catch (error) {
    console.warn("[superfluid-stack] pinata pinList error (points snapshot)", {
      error,
    });
    return null;
  }
};

const hydratePointsSnapshotFromIpfs = async () => {
  const cid =
    latestPointsSnapshotCid ?? (await ensureLatestPointsSnapshotCid()) ?? null;
  if (!cid) return;
  const data = await fetchIpfsJson(cid);
  const wallets = (data as any)?.wallets;
  if (!Array.isArray(wallets)) return;
  console.log("[superfluid-stack] hydrating points snapshot cache", {
    cid,
    count: wallets.length,
  });
  const farcasterMap = new Map<string, string>();
  const ensMap = new Map<string, string>();
  const ensAvatarMap = new Map<string, string>();
  const nativeSuperMap = new Map<string, string>();
  const nativeTokenMap = new Map<string, string>();
  for (const w of wallets) {
    const addr = typeof w?.address === "string" ? w.address.toLowerCase() : "";
    if (!addr.startsWith("0x")) continue;
    if (typeof w?.farcasterUsername === "string") {
      farcasterMap.set(addr, w.farcasterUsername);
    }
    if (typeof w?.ensName === "string") {
      ensMap.set(addr, w.ensName);
    }
    if (typeof w?.ensAvatar === "string") {
      ensAvatarMap.set(addr, w.ensAvatar);
    }
    if (typeof w?.nativeSuperToken === "string") {
      nativeSuperMap.set(addr, w.nativeSuperToken as Address);
    }
    if (typeof w?.nativeToken === "string") {
      nativeTokenMap.set(addr, w.nativeToken as Address);
    }
  }
  farcasterUsernameCache = farcasterMap;
  ensNameCache = ensMap;
  ensAvatarCache = ensAvatarMap;
  nativeSuperTokenCache = nativeSuperMap;
  nativeTokenCache = nativeTokenMap;
};

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
  const cached = creationBlockCache.get(cacheKey);
  if (
    cached !== undefined &&
    cached !== null &&
    (!searchStart || cached >= searchStart)
  ) {
    return cached;
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
    campaignVersion: CAMPAIGN_VERSION,
    entries,
  };
  try {
    const data = await pinataClient?.pinJSONToIPFS(
      normalizeForPinata(payload),
      {
        pinataMetadata: {
          name: PINATA_TRANSFER_CACHE_NAME,
          keyvalues: {
            updatedAt: payload.updatedAt,
            campaignVersion: CAMPAIGN_VERSION,
          },
        } as any,
        pinataOptions:
          PINATA_GROUP_ID ? ({ groupId: PINATA_GROUP_ID } as any) : undefined,
      },
    );
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

const pinPriceCacheToIpfs = async (): Promise<string | null> => {
  if (!CAN_WRITE_PINATA || !priceCacheDirty || tokenPriceCache.size === 0)
    return null;
  const entries = Object.fromEntries(tokenPriceCache.entries());
  const payload = {
    updatedAt: new Date().toISOString(),
    ttlMs: TOKEN_PRICE_CACHE_TTL_MS,
    entries,
  };
  try {
    const data = await pinataClient?.pinJSONToIPFS(
      normalizeForPinata(payload),
      {
        pinataMetadata: {
          name: PINATA_PRICE_CACHE_NAME,
          keyvalues: { updatedAt: payload.updatedAt },
        } as any,
        pinataOptions:
          PINATA_GROUP_ID ? ({ groupId: PINATA_GROUP_ID } as any) : undefined,
      },
    );
    if (data?.IpfsHash) {
      latestPriceCacheCid = data.IpfsHash;
      console.log("[superfluid-stack] pinned token price cache to IPFS", {
        cid: data.IpfsHash,
      });
      return data.IpfsHash;
    }
    return null;
  } catch (error) {
    console.warn("[superfluid-stack] pinata pinJSONToIPFS error (prices)", {
      error,
    });
    return null;
  }
};

const persistPriceCache = async (): Promise<string | null> => {
  if (!priceCacheDirty) return null;
  const cid = await pinPriceCacheToIpfs();
  priceCacheDirty = false;
  return cid ?? latestPriceCacheCid;
};

const pinPointsSnapshotToIpfs = async (
  wallets: {
    address: string;
    fundUsd: number;
    streamUsd: number;
    fundPoints: number;
    streamPoints: number;
    superfluidActivityPoints: number;
    governanceStakePoints: number;
    farcasterPoints: number;
    totalPoints: number;
    farcasterUsername: string | null;
    ensName: string | null;
    ensAvatar: string | null;
    nativeSuperToken: string | null;
    nativeToken: string | null;
  }[],
): Promise<string | null> => {
  if (!CAN_WRITE_PINATA || !wallets.length) return null;
  const payload = {
    updatedAt: new Date().toISOString(),
    wallets,
  };
  try {
    const data = await pinataClient?.pinJSONToIPFS(
      normalizeForPinata(payload),
      {
        pinataMetadata: {
          name: PINATA_POINTS_SNAPSHOT_NAME,
          keyvalues: { updatedAt: payload.updatedAt },
        } as any,
        pinataOptions:
          PINATA_GROUP_ID ? ({ groupId: PINATA_GROUP_ID } as any) : undefined,
      },
    );
    if (data?.IpfsHash) {
      console.log("[superfluid-stack] pinned points snapshot to IPFS", {
        cid: data.IpfsHash,
        walletCount: wallets.length,
        duplicate: Boolean((data as any)?.isDuplicate),
      });
      return data.IpfsHash;
    }
    return null;
  } catch (error) {
    console.warn("[superfluid-stack] pinata pinJSONToIPFS error (points)", {
      error,
    });
    return null;
  }
};

const pinRunLogsToIpfs = async (logs: string[]): Promise<string | null> => {
  if (!SHOULD_PIN_RUN_LOGS || !CAN_WRITE_PINATA || logs.length === 0) {
    return null;
  }
  const payload = {
    updatedAt: new Date().toISOString(),
    campaignVersion: CAMPAIGN_VERSION,
    lines: logs,
  };
  try {
    const data = await pinataClient?.pinJSONToIPFS(
      normalizeForPinata(payload),
      {
        pinataMetadata: {
          name: PINATA_RUN_LOG_NAME,
          keyvalues: {
            updatedAt: payload.updatedAt,
            campaignVersion: CAMPAIGN_VERSION,
          },
        } as any,
        pinataOptions:
          PINATA_GROUP_ID ? ({ groupId: PINATA_GROUP_ID } as any) : undefined,
      },
    );
    if (data?.IpfsHash) {
      console.log("[superfluid-stack] pinned run logs to IPFS", {
        cid: data.IpfsHash,
        lines: logs.length,
      });
      return data.IpfsHash;
    }
    return null;
  } catch (error) {
    console.warn("[superfluid-stack] failed to pin run logs", { error });
    return null;
  }
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
  let totalLogs = 0;
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
      const chunkSize = Array.isArray(chunk) ? chunk.length : 0;
      totalLogs += chunkSize;
      console.log("[superfluid-stack] fetchTransferLogs page", {
        fromBlock: start.toString(),
        toBlock: chunkEnd.toString(),
        pageSize: chunkSize,
        totalLogs,
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
  }: {
    receiver: Address;
    token: Address;
  },
): Promise<FlowUpdate[]> => {
  console.log("[superfluid-stack] Fetching flow updates", {
    receiver,
    token,
  });
  const result = await client
    .query<{ flowUpdatedEvents: any[] }>(FLOW_UPDATES_QUERY, {
      receiver: receiver.toLowerCase(),
      token: token.toLowerCase(),
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
}): {
  perSender: Map<string, number>;
  totalUsd: number;
  totalUsdAll: number;
} => {
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
  let totalUsd = 0; // only senders above threshold
  let totalUsdAll = 0; // all senders, no threshold

  for (const [sender, updates] of updatesBySender.entries()) {
    updates.sort((a, b) => a.timestamp - b.timestamp);
    let lastTs = windowStart;
    let lastRate = 0n;
    let usdTotal = 0;

    for (const upd of updates) {
      const ts = upd.timestamp;
      if (ts <= windowStart) {
        // Update current rate before the window without counting pre-window time.
        lastRate = upd.flowRate;
        lastTs = windowStart;
        continue;
      }

      const segStart = lastTs;
      const segEnd = Math.min(ts, effectiveEnd);
      if (segStart < segEnd && lastRate > 0n) {
        const duration = BigInt(segEnd - segStart);
        const streamedAmount = lastRate * duration;
        const amount = Number(formatUnits(streamedAmount, tokenDecimals));
        usdTotal += amount * priceUsd;
      }
      lastTs = ts;
      lastRate = upd.flowRate;
      if (lastTs >= effectiveEnd) break;
    }

    if (lastTs < effectiveEnd && lastRate > 0n) {
      const duration = BigInt(effectiveEnd - lastTs);
      const streamedAmount = lastRate * duration;
      const amount = Number(formatUnits(streamedAmount, tokenDecimals));
      usdTotal += amount * priceUsd;
    }

    if (usdTotal > 0) {
      totalUsdAll += usdTotal;
      if (usdTotal >= 10) {
        totalUsd += usdTotal;
        if (isValidAddr(sender)) {
          usdBySender.set(sender, usdTotal);
        }
      }
    }
  }

  return { perSender: usdBySender, totalUsd, totalUsdAll };
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
  multiplier = 1,
  superfluidActivityPoints,
}: {
  publicClient: ReturnType<typeof createPublicClient>;
  poolAddress: Address;
  token: Address;
  fromBlock: bigint;
  toBlock: bigint;
  tokenDecimals: number;
  priceUsd: number;
  userTotals: Map<string, { fundUsd: number; streamUsd: number }>;
  multiplier?: number;
  superfluidActivityPoints?: Map<string, number>;
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
    userTotals.set(key, {
      ...prev,
      fundUsd: prev.fundUsd + usd * multiplier,
    });
    if (superfluidActivityPoints) {
      superfluidActivityPoints.set(
        key,
        (superfluidActivityPoints.get(key) ?? 0) + usd * multiplier,
      );
    }
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
  superfluidActivityPoints: Map<string, number>;
  governanceStakePoints: Map<string, number>;
  blockBounds: { startBlock: bigint; endBlock: bigint };
  streamTotalsByPool: Map<string, number>;
  debug: {
    poolsProcessed: number;
    flowUpdateCount: number;
    superfluidActivityWallets: number;
    governanceStakeCount: number;
  };
  nativePools: { poolAddress: Address; token: Address }[];
  processedCommunities: ProcessedCommunity[];
  fetchedPrices: { token: Address; symbol: string; priceUsd: number }[];
  bonusCommunityMembers: string[];
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
    try {
      const resolved = await resolveSuperToken(superfluidClient, token);
      if (resolved) {
        superTokenCache.set(key, resolved);
      }
      return resolved;
    } catch (error) {
      console.warn("[superfluid-stack] super token resolution failed", {
        token,
        chainId,
        superfluidSubgraphUrl,
        error,
      });
      return null;
    }
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
  const farcasterPoints = new Map<string, number>();
  const fetchedPrices: { token: Address; symbol: string; priceUsd: number }[] =
    [];
  const bonusCommunityMembers = new Set<string>();

  let [startBlock, endBlock] = await Promise.all([
    findBlockNumberAtOrAfter(publicClient, windowStart),
    findBlockNumberAtOrBefore(publicClient, windowEnd),
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
    if (
      chainId === 8453 &&
      toLower(comm.id) === toLower(BASE_BONUS_COMMUNITY)
    ) {
      for (const member of members) {
        if (isValidAddr(member.memberAddress)) {
          bonusCommunityMembers.add(toLower(member.memberAddress));
        }
      }
    }
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
  const streamTotalsByPool = new Map<string, number>();
  const processedCommunities = new Map<string, ProcessedCommunity>();

  const nativePools: { poolAddress: Address; token: Address }[] = [];
  let poolsProcessed = 0;
  let flowUpdateCount = 0;
  const superfluidActivityPoints = new Map<string, number>();
  const governanceStakePoints = new Map<string, number>();

  const getCachedTokenPrice = async ({
    token,
    symbol,
  }: {
    token: Address;
    symbol: string;
  }): Promise<number> => {
    const key = `${chainId}-${toLower(token)}`;
    const cached = tokenPriceCache.get(key);
    const now = Date.now();
    if (cached && now - cached.fetchedAt < TOKEN_PRICE_CACHE_TTL_MS) {
      return cached.price;
    }
    const price = await getTokenUsdPrice({
      chainId: Number(chainId),
      address: token,
      symbol,
    });
    tokenPriceCache.set(key, { price, fetchedAt: now, symbol });
    priceCacheDirty = true;
    return price;
  };

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
      priceUsd = await getCachedTokenPrice({
        token: underlyingToken,
        symbol,
      });
      console.log("[superfluid-stack] token price fetched", {
        chainId,
        token: underlyingToken,
        symbol,
        priceUsd,
      });
      fetchedPrices.push({
        token: underlyingToken,
        symbol,
        priceUsd,
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

    const community = communityByPool.get(poolAddress);
    const bonusMultiplier =
      (
        chainId === 8453 &&
        community &&
        toLower(community.id) === toLower(BASE_BONUS_COMMUNITY)
      ) ?
        2
      : 1;
    const qualifiesForSuperfluidBonus =
      community && toLower(community.id) === toLower(BASE_BONUS_COMMUNITY);

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
        multiplier: bonusMultiplier,
        superfluidActivityPoints:
          qualifiesForSuperfluidBonus ? superfluidActivityPoints : undefined,
      });
    }

    let streamUsdTotalPoints = 0;
    let streamUsdTotalAll = 0;
    if (allowStreams && superTokenDecimals !== null) {
      const flowUpdates = await fetchFlowUpdates(superfluidClient, {
        receiver: poolAddress,
        token: superfluidTokenAddress as Address,
      });
      flowUpdateCount += flowUpdates.length;
      if (flowUpdates.length === 0) {
        console.log("[superfluid-stack] no flow updates for pool", {
          chainId,
          poolAddress,
          token: underlyingToken,
          superfluidToken: superfluidTokenAddress,
        });
      }
      const {
        perSender: streamUsdBySender,
        totalUsd,
        totalUsdAll,
      } = calculateStreamUsdBySender({
        flowUpdates,
        tokenDecimals: superTokenDecimals,
        priceUsd,
        windowStart,
        windowEnd,
      });
      streamUsdTotalPoints = totalUsd;
      streamUsdTotalAll = totalUsdAll;
      for (const [sender, usd] of streamUsdBySender.entries()) {
        if (usd < 10) continue;
        const key = toLower(sender);
        const prev = userTotals.get(key) ?? { fundUsd: 0, streamUsd: 0 };
        userTotals.set(key, {
          ...prev,
          streamUsd: prev.streamUsd + usd * bonusMultiplier,
        });
        if (qualifiesForSuperfluidBonus) {
          const existingActivity = superfluidActivityPoints.get(key) ?? 0;
          superfluidActivityPoints.set(
            key,
            existingActivity + usd * bonusMultiplier,
          );
        }
      }
      if (flowUpdates.length > 0 && streamUsdTotalPoints === 0) {
        console.log(
          "[superfluid-stack] stream total below threshold, skipping pool entry",
          {
            chainId,
            poolAddress,
            token: underlyingToken,
            superfluidToken: superfluidTokenAddress,
            flowUpdates: flowUpdates.length,
            totalUsd: totalUsd,
            totalUsdAll: totalUsdAll,
          },
        );
      }
    }
    if (streamUsdTotalAll > 0) {
      const poolKey = toLower(poolAddress);
      streamTotalsByPool.set(
        poolKey,
        (streamTotalsByPool.get(poolKey) ?? 0) + streamUsdTotalAll,
      );
      console.log("[superfluid-stack] stream total recorded for pool", {
        chainId,
        poolAddress,
        token: underlyingToken,
        superfluidToken: superfluidTokenAddress,
        flowUpdates: flowUpdateCount,
        streamUsdTotal: streamUsdTotalAll,
      });
    }

    if (community) {
      const entry = communityTotals.get(community.id) ?? {
        fundUsd: 0,
        streamUsd: 0,
        members: community.members,
      };
      let fundUsdForCommunity = 0;
      if (superToken.sameAsUnderlying) {
        fundUsdForCommunity = await computeFundUsdToPool({
          publicClient,
          poolAddress,
          token: underlyingToken,
          fromBlock: poolStartBlock,
          toBlock: endBlock,
          tokenDecimals: tokenDecimals as number,
          priceUsd,
        });
        entry.fundUsd += fundUsdForCommunity * bonusMultiplier;
      }
      entry.streamUsd += streamUsdTotalAll * bonusMultiplier;
      communityTotals.set(community.id, entry);

      const processed = processedCommunities.get(community.id) ?? {
        communityId: community.id,
        communityName: community.communityName,
        streamUsd: 0,
        fundUsd: 0,
        pools: [],
      };
      processed.streamUsd =
        (processed.streamUsd ?? 0) + streamUsdTotalAll * bonusMultiplier;
      if (superToken.sameAsUnderlying) {
        processed.fundUsd =
          (processed.fundUsd ?? 0) +
          fundUsdForCommunity * bonusMultiplier;
      }
      processed.pools.push({
        poolAddress: toLower(poolAddress),
        token: toLower(underlyingToken),
        superfluidToken:
          superfluidTokenAddress ? toLower(superfluidTokenAddress) : undefined,
        title: poolTitle,
      });
      processedCommunities.set(community.id, processed);
    }
  }

  // Split community totals to members
  for (const entry of communityTotals.values()) {
    const totalUsd = entry.fundUsd + entry.streamUsd;
    if (totalUsd <= 0) continue;
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
      const prev = governanceStakePoints.get(key) ?? 0;
      governanceStakePoints.set(key, prev + points);
    }
  }

  return {
    totals: userTotals,
    missingPrices,
    superfluidActivityPoints,
    governanceStakePoints,
    blockBounds: { startBlock, endBlock },
    streamTotalsByPool,
    debug: {
      poolsProcessed,
      flowUpdateCount,
      superfluidActivityWallets: superfluidActivityPoints.size,
      governanceStakeCount: communityTotals.size,
    },
    nativePools,
    processedCommunities: Array.from(processedCommunities.values()),
    fetchedPrices,
    bonusCommunityMembers: Array.from(bonusCommunityMembers.values()),
  };
};

export async function GET(req: Request) {
  const runLogBuffer: string[] = [];
  const originalConsole = {
    log: console.log,
    warn: console.warn,
    error: console.error,
  };
  const record =
    (level: "log" | "warn" | "error") =>
    (...args: any[]) => {
      try {
        const text = args
          .map((arg) => (typeof arg === "string" ? arg : safeStringify(arg)))
          .join(" ");
        runLogBuffer.push(`[${level}] ${text}`);
      } catch {
        /* ignore */
      }
      originalConsole[level](...args);
    };
  console.log = record("log") as typeof console.log;
  console.warn = record("warn") as typeof console.warn;
  console.error = record("error") as typeof console.error;

  const auth = req.headers.get("authorization")?.replace("Bearer ", "");

  if (auth !== process.env.CRON_SECRET) {
    console.log = originalConsole.log;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  ensureEnsCacheFresh();
  if (Date.now() > campaignEndMS) {
    console.log = originalConsole.log;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
    return NextResponse.json(
      { message: "Campaign ended; sync not executed." },
      { status: 200 },
    );
  }
  let superfluidStackClient: ReturnType<typeof getSuperfluidStackClient>;
  try {
    superfluidStackClient = getSuperfluidStackClient();
  } catch (err) {
    console.error("[superfluid-stack] stack client init failed", err);
    return NextResponse.json(
      { error: "Stack client not configured" },
      { status: 500 },
    );
  }
  // Reset transient state each run
  notionDisabled = false;
  await cacheHydrationPromise;
  await hydratePointsSnapshotFromIpfs();
  // Invalidate caches if campaign window changed since last hydration
  if (
    creationCacheCampaignVersion &&
    creationCacheCampaignVersion !== CAMPAIGN_VERSION
  ) {
    creationBlockCache.clear();
    creationBlockCacheDirty = false;
    latestCreationBlockCacheCid = null;
    creationCacheCampaignVersion = null;
  }
  if (
    transferCacheCampaignVersion &&
    transferCacheCampaignVersion !== CAMPAIGN_VERSION
  ) {
    // Keep cache; we'll extend to cover the new window instead of dropping it.
    transferCacheCampaignVersion = null;
  }

  const flushCaches = async () => {
    const [creationPin, transferPin, pricePin] = await Promise.all([
      persistCreationBlockCache(),
      persistTransferLogCache(),
      persistPriceCache(),
    ]);
    return {
      creationBlockCacheCid: creationPin ?? latestCreationBlockCacheCid ?? null,
      transferLogCacheCid: transferPin ?? latestTransferLogCacheCid ?? null,
      priceCacheCid: pricePin ?? latestPriceCacheCid ?? null,
    };
  };
  const logPinnedArtifacts = (extras?: {
    pointsSnapshotCid?: string | null;
    creationBlockCacheCid?: string | null;
    transferLogCacheCid?: string | null;
    priceCacheCid?: string | null;
    runLogsCid?: string | null;
  }) => {
    console.log("[superfluid-stack] pinned IPFS artifacts", {
      creationBlockCacheCid:
        extras?.creationBlockCacheCid ??
        responseCreationCid ??
        latestCreationBlockCacheCid ??
        null,
      transferLogCacheCid:
        extras?.transferLogCacheCid ??
        responseTransferCid ??
        latestTransferLogCacheCid ??
        null,
      priceCacheCid:
        extras?.priceCacheCid ??
        latestPriceCacheCid ??
        pinnedPriceCacheCid ??
        null,
      pointsSnapshotCid:
        extras?.pointsSnapshotCid ??
        responsePointsCid ??
        latestPointsSnapshotCid ??
        null,
      runLogsCid: extras?.runLogsCid ?? responseRunLogsCid ?? null,
    });
  };
  let responseCreationCid: string | null = null;
  let responseTransferCid: string | null = null;
  let responsePointsCid: string | null = null;
  let pinnedPriceCacheCid: string | null = null;
  let responseRunLogsCid: string | null = null;
  const notionExistingPages = new Map<
    string,
    { pageId: string; totalPts: number; checksum: string | null }
  >();

  try {
    const { start, end } = parseCampaignWindow();
    const totals = new Map<string, { fundUsd: number; streamUsd: number }>();
    const superfluidActivityPointsByWallet = new Map<string, number>();
    const governanceStakePointsByWallet = new Map<string, number>();
    const farcasterPointsByWallet = new Map<string, number>();
    const farcasterFollowerWalletsSet = new Set<string>();
    const farcasterUsernameByWallet = new Map<string, string>();
    const ensNameByWallet = new Map<string, string>();
    const ensAvatarByWallet = new Map<string, string>();
    const nativeSuperTokenByWallet = new Map<string, string>();
    const nativeTokenByWallet = new Map<string, string>();
    for (const [addr, name] of ensNameCache.entries()) {
      ensNameByWallet.set(addr, name);
    }
    for (const [addr, avatar] of ensAvatarCache.entries()) {
      ensAvatarByWallet.set(addr, avatar);
    }
    for (const [addr, token] of nativeSuperTokenCache.entries()) {
      nativeSuperTokenByWallet.set(addr, token);
    }
    for (const [addr, token] of nativeTokenCache.entries()) {
      nativeTokenByWallet.set(addr, token);
    }
    const chainDebug: {
      chainId: ChainId;
      poolsProcessed: number;
      flowUpdateCount: number;
      superfluidActivityWallets: number;
      governanceStakeCount: number;
    }[] = [];
    const missingPriceEntries: {
      address: Address;
      symbol: string;
      chainId: ChainId;
    }[] = [];
    const streamTotalsByChain: Record<string, Record<string, number>> = {};
    const fetchedPricesByChain: Record<
      string,
      { token: Address; symbol: string; priceUsd: number }[]
    > = {};
    const manualBoundsByChain: Record<
      string,
      { startBlock: string; endBlock: string }
    > = {};
    const nativePoolsByChain: Record<
      string,
      { poolAddress: Address; token: Address }[]
    > = {};
    const communitiesByChain: Record<string, ProcessedCommunity[]> = {};
    const farcasterFollowerWallets: string[] = [];
    const farcasterDiscardedWallets: string[] = [];
    const nativeSuperTokens: { address: string; token: string | null }[] = [];
    const nativeTokens: { address: string; token: string | null }[] = [];
    const bonusCommunityMembers = new Set<string>();

    const fetchExistingFarcasterAddresses = async (): Promise<Set<string>> => {
      const addrs = new Set<string>();
      const limit = 250;
      let offset = 0;
      while (true) {
        const res = await superfluidStackClient.getEvents({
          event: "farcasterPoints",
          limit,
          offset,
        });
        console.log("[superfluid-stack] stack getEvents farcaster sweep", {
          offset,
          limit,
          count: Array.isArray(res) ? res.length : 0,
        });
        if (!Array.isArray(res) || res.length === 0) break;
        for (const evt of res as any[]) {
          const addr =
            evt?.address ??
            evt?.walletAddress ??
            evt?.accountAddress ??
            evt?.account;
          if (typeof addr === "string" && addr.toLowerCase().startsWith("0x")) {
            addrs.add(addr.toLowerCase());
          }
        }
        offset += res.length;
        if (res.length < limit) break;
      }
      return addrs;
    };

    if (!FARCASTER_DISABLED) {
      const gardensFid = await fetchGardensFid();
      if (gardensFid) {
        const followerFids = await fetchFarcasterFollowerFids(gardensFid);
        const {
          primary: followerWallets,
          discarded,
          usernames,
        } = await fetchFarcasterWalletsForFids(followerFids);
        followerWallets.forEach((addr) =>
          farcasterFollowerWalletsSet.add(addr),
        );
        discarded.forEach((addr) => farcasterDiscardedWallets.push(addr));
        for (const [addr, username] of usernames.entries()) {
          farcasterUsernameByWallet.set(addr, username);
        }
      } else {
        console.log(
          "[superfluid-stack] skipping farcaster follower scan because gardens fid could not be resolved",
        );
      }
      farcasterFollowerWallets.push(...farcasterFollowerWalletsSet);
    }
    for (const [addr, username] of farcasterUsernameCache.entries()) {
      if (farcasterFollowerWalletsSet.has(addr)) {
        farcasterUsernameByWallet.set(addr, username);
      }
    }
    const existingFarcasterAddresses = await fetchExistingFarcasterAddresses();

    for (const chainId of TARGET_CHAINS) {
      const {
        totals: chainTotals,
        missingPrices,
        superfluidActivityPoints,
        governanceStakePoints,
        blockBounds,
        nativePools,
        debug,
        processedCommunities,
        fetchedPrices,
        streamTotalsByPool,
        bonusCommunityMembers: chainBonusMembers,
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
      for (const [addr, pts] of superfluidActivityPoints.entries()) {
        const key = toLower(addr);
        superfluidActivityPointsByWallet.set(
          key,
          (superfluidActivityPointsByWallet.get(key) ?? 0) + pts,
        );
      }
      for (const [addr, pts] of governanceStakePoints.entries()) {
        const key = toLower(addr);
        governanceStakePointsByWallet.set(
          key,
          (governanceStakePointsByWallet.get(key) ?? 0) + pts,
        );
      }
      manualBoundsByChain[String(chainId)] = {
        startBlock: blockBounds.startBlock.toString(),
        endBlock: blockBounds.endBlock.toString(),
      };
      nativePoolsByChain[String(chainId)] = nativePools;
      chainBonusMembers.forEach((addr) =>
        bonusCommunityMembers.add(toLower(addr)),
      );
      // Track native super tokens per pool address
      nativePools.forEach((p) => {
        nativeSuperTokenByWallet.set(p.poolAddress.toLowerCase(), p.token);
        nativeSuperTokens.push({
          address: p.poolAddress.toLowerCase(),
          token: p.token.toLowerCase(),
        });
        nativeTokenByWallet.set(p.poolAddress.toLowerCase(), p.token);
        nativeTokens.push({
          address: p.poolAddress.toLowerCase(),
          token: p.token.toLowerCase(),
        });
      });
      chainDebug.push({ chainId, ...debug });
      fetchedPricesByChain[String(chainId)] = fetchedPrices;
      communitiesByChain[String(chainId)] = processedCommunities.map(
        (c: ProcessedCommunity) => ({
          ...c,
          communityId: c.communityId.toLowerCase(),
          communityName: c.communityName,
          streamUsd: c.streamUsd ?? 0,
          fundUsd: c.fundUsd ?? 0,
          pools: c.pools.map((p: ProcessedCommunity["pools"][number]) => ({
            ...p,
            poolAddress: p.poolAddress.toLowerCase(),
            token: p.token.toLowerCase(),
            superfluidToken: p.superfluidToken?.toLowerCase() ?? undefined,
          })),
        }),
      );
      streamTotalsByChain[String(chainId)] = Object.fromEntries(
        streamTotalsByPool.entries(),
      );
    }

    const manualBounds = {
      ...manualBoundsByChain,
      startTimestamp: start,
      endTimestamp: end,
    };
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
      superfluidActivityPoints: number;
      governanceStakePoints: number;
      farcasterPoints: number;
      totalPoints: number;
      farcasterUsername: string | null;
      ensName: string | null;
      ensAvatar: string | null;
      nativeSuperToken: string | null;
      nativeToken: string | null;
      checksum: string;
    }[] = [];

    const allAddresses = new Set<string>([
      ...totals.keys(),
      ...superfluidActivityPointsByWallet.keys(),
      ...governanceStakePointsByWallet.keys(),
      ...farcasterFollowerWalletsSet.values(),
      ...farcasterDiscardedWallets.values(),
      ...existingFarcasterAddresses.values(),
      ...bonusCommunityMembers.values(),
    ]);

    if (!SKIP_IDENTITY_RESOLUTION) {
      for (const address of allAddresses) {
        if (ensNameByWallet.has(address) && ensAvatarByWallet.has(address)) {
          continue;
        }
        const { name, avatar } = await fetchEnsIdentityByAddress(address);
        if (name) ensNameByWallet.set(address, name);
        if (avatar) ensAvatarByWallet.set(address, avatar);
      }
    }
    // Pre-fill Farcaster points (+1 per follower wallet)
    for (const addr of farcasterFollowerWalletsSet) {
      farcasterPointsByWallet.set(addr, 1);
    }

    const walletPointTargets: Array<{
      address: string;
      fundPoints: number;
      streamPoints: number;
      superfluidActivityPoints: number;
      governanceStakePoints: number;
      farcasterPoints: number;
      totalPoints: number;
      fundUsd: number;
      streamUsd: number;
    }> = [];

    for (const address of allAddresses) {
      const value = totals.get(address) ?? { fundUsd: 0, streamUsd: 0 };
      const fundPoints = value.fundUsd >= 10 ? Math.floor(value.fundUsd) : 0;
      const streamPoints =
        value.streamUsd >= 10 ? Math.floor(value.streamUsd) : 0;
      const superfluidActivityPts = Math.floor(
        superfluidActivityPointsByWallet.get(address) ?? 0,
      );
      const governanceStakePtsRaw =
        governanceStakePointsByWallet.get(address) ?? 0;
      const isBonusCommunityMember = bonusCommunityMembers.has(address);
      const governanceStakePts =
        governanceStakePtsRaw > 0 ?
          Math.max(
            Math.floor(governanceStakePtsRaw),
            isBonusCommunityMember ? 1 : 0,
          )
        : 0;
      const farcasterPts = Math.floor(
        farcasterPointsByWallet.get(address) ?? 0,
      );
      const totalPoints =
        fundPoints +
        streamPoints +
        superfluidActivityPts +
        governanceStakePts +
        farcasterPts;
      if (totalPoints <= 0) continue;

      walletPointTargets.push({
        address,
        fundPoints,
        streamPoints,
        superfluidActivityPoints: superfluidActivityPts,
        governanceStakePoints: governanceStakePts,
        farcasterPoints: farcasterPts,
        totalPoints,
        fundUsd: value.fundUsd,
        streamUsd: value.streamUsd,
      });
    }

    const EVENT_NAMES = [
      "fundPoints",
      "streamPoints",
      "superfluidActivityPoints",
      "governanceStakePoints",
      "farcasterPoints",
    ] as const;

    const fetchExistingTotalsByAddress = async (): Promise<
      Map<string, Record<string, number>>
    > => {
      const limit = 250;
      let offset = 0;
      const existingMap = new Map<string, Record<string, number>>();
      while (true) {
        console.log("[superfluid-stack] stack getEvents sweep request", {
          offset,
          limit,
        });
        const res = await superfluidStackClient.eventClient.getEvents({
          query: { limit, offset },
        });
        console.log("[superfluid-stack] stack getEvents sweep response", {
          offset,
          limit,
          count: Array.isArray(res) ? res.length : 0,
        });
        if (!Array.isArray(res) || res.length === 0) break;
        for (const evt of res as any[]) {
          const name = evt?.event as string;
          if (!EVENT_NAMES.includes(name as (typeof EVENT_NAMES)[number]))
            continue;
          const pts = Number(evt?.points ?? 0);
          const addr =
            evt?.address ??
            evt?.walletAddress ??
            evt?.accountAddress ??
            evt?.account;
          if (typeof addr !== "string" || !addr.toLowerCase().startsWith("0x"))
            continue;
          const key = addr.toLowerCase();
          const existingTotals =
            existingMap.get(key) ??
            EVENT_NAMES.reduce(
              (acc, n) => {
                acc[n] = 0;
                return acc;
              },
              {} as Record<string, number>,
            );
          existingTotals[name] = (existingTotals[name] ?? 0) + pts;
          existingMap.set(key, existingTotals);
        }
        offset += res.length;
        if (res.length < limit) break;
      }
      return existingMap;
    };

    const allEventPayloads: Array<{
      event: string;
      payload: { account: string; points: number; metadata?: any };
    }> = [];
    const existingTotalsByAddress = await fetchExistingTotalsByAddress();

    const emptyCategoryTotals = EVENT_NAMES.reduce(
      (acc, n) => {
        acc[n] = 0;
        return acc;
      },
      {} as Record<string, number>,
    );

    for (const wallet of walletPointTargets) {
      const existingByCategory =
        existingTotalsByAddress.get(wallet.address) ?? emptyCategoryTotals;
      const targetByCategory: Record<string, number> = {
        fundPoints: wallet.fundPoints,
        streamPoints: wallet.streamPoints,
        superfluidActivityPoints: wallet.superfluidActivityPoints,
        governanceStakePoints: wallet.governanceStakePoints,
        farcasterPoints: wallet.farcasterPoints,
      };
      const deltas: Record<string, number> = {};
      for (const name of EVENT_NAMES) {
        deltas[name] = targetByCategory[name] - (existingByCategory[name] ?? 0);
        if (deltas[name] !== 0) {
          allEventPayloads.push({
            event: name,
            payload: {
              account: wallet.address,
              points: deltas[name],
              metadata: {
                category: name,
                target: targetByCategory[name],
                existing: existingByCategory[name] ?? 0,
                fundPoints: wallet.fundPoints,
                streamPoints: wallet.streamPoints,
                superfluidActivityPoints: wallet.superfluidActivityPoints,
                governanceStakePoints: wallet.governanceStakePoints,
                farcasterPoints: wallet.farcasterPoints,
              },
            },
          });
        }
      }
      const existingTotal = Object.values(existingByCategory).reduce(
        (acc, n) => acc + Number(n ?? 0),
        0,
      );
      const addedDelta = Object.values(deltas).reduce(
        (acc, n) => acc + (n > 0 ? n : 0),
        0,
      );

      updates.push({
        address: wallet.address,
        added: addedDelta,
        total: wallet.totalPoints,
        existing: existingTotal,
        target: wallet.totalPoints,
      });
      walletBreakdown.push({
        address: wallet.address,
        fundUsd: wallet.fundUsd,
        streamUsd: wallet.streamUsd,
        fundPoints: wallet.fundPoints,
        streamPoints: wallet.streamPoints,
        superfluidActivityPoints: wallet.superfluidActivityPoints,
        governanceStakePoints: wallet.governanceStakePoints,
        farcasterPoints: wallet.farcasterPoints,
        totalPoints: wallet.totalPoints,
        farcasterUsername:
          farcasterUsernameByWallet.get(wallet.address) ?? null,
        ensName: ensNameByWallet.get(wallet.address) || null,
        ensAvatar: ensAvatarByWallet.get(wallet.address) || null,
        nativeSuperToken: nativeSuperTokenByWallet.get(wallet.address) ?? null,
        nativeToken: nativeTokenByWallet.get(wallet.address) ?? null,
        checksum: [
          wallet.address.toLowerCase(),
          wallet.fundPoints,
          wallet.streamPoints,
          wallet.superfluidActivityPoints,
          wallet.governanceStakePoints,
          wallet.farcasterPoints,
          wallet.totalPoints,
        ].join("|"),
      });
    }

    // Remove accounts that are no longer in the current target list
    for (const [address, existingByCategory] of existingTotalsByAddress) {
      if (walletPointTargets.find((w) => w.address === address)) continue;
      const targetByCategory: Record<string, number> = {
        fundPoints: 0,
        streamPoints: 0,
        superfluidActivityPoints: 0,
        governanceStakePoints: 0,
        farcasterPoints: 0,
      };
      const deltas: Record<string, number> = {};
      for (const name of EVENT_NAMES) {
        deltas[name] = targetByCategory[name] - (existingByCategory[name] ?? 0);
        if (deltas[name] !== 0) {
          allEventPayloads.push({
            event: name,
            payload: {
              account: address,
              points: deltas[name],
              metadata: {
                category: name,
                target: targetByCategory[name],
                existing: existingByCategory[name] ?? 0,
              },
            },
          });
        }
      }
      const existingTotal = Object.values(existingByCategory).reduce(
        (acc, n) => acc + Number(n ?? 0),
        0,
      );
      updates.push({
        address,
        added: 0,
        total: 0,
        existing: existingTotal,
        target: 0,
      });
    }

    if (allEventPayloads.length && !STACK_DRY_RUN) {
      console.log("[superfluid-stack] stack sendEvents request", {
        count: allEventPayloads.length,
      });
      for (let i = 0; i < allEventPayloads.length; i += 250) {
        const batch = allEventPayloads.slice(i, i + 250);
        console.log("[superfluid-stack] stack sendEvents batch", {
          batchStart: i,
          batchEnd: i + batch.length - 1,
          batchSize: batch.length,
        });
        const resp = await superfluidStackClient.eventClient.sendEvents(batch);
        console.log("[superfluid-stack] stack sendEvents response", {
          batchStart: i,
          batchEnd: i + batch.length - 1,
          response: resp,
        });
      }
    } else if (STACK_DRY_RUN) {
      console.log("[superfluid-stack] DRY RUN - skipping event pushes", {
        eventCount: allEventPayloads.length,
      });
    }

    // Export as CSV (Notion sync runs when configured; CSV remains fallback)
    const walletBreakdownCsv = buildWalletCsv(walletBreakdown);
    const pointsSnapshotPromise =
      walletBreakdown.length && CAN_WRITE_PINATA ?
        pinPointsSnapshotToIpfs(walletBreakdown)
      : null;

    let notionSync = {
      attempted: false,
      success: false,
      processed: 0,
      failed: 0,
    };

    if (notionClient && NOTION_DB_ID_TRIMMED && !notionDisabled) {
      notionSync.attempted = true;
      try {
        // Fetch existing pages to update in place
        let cursor: string | undefined;
        let fetched = 0;
        do {
          const body: Record<string, any> = { page_size: 50 };
          if (cursor) body.start_cursor = cursor;
          const res = await notionQueryDb(body);
          if (!res) break;
          cursor = res.next_cursor ?? undefined;
          const pages = res.results ?? [];
          for (const page of pages) {
            const pid = (page as any)?.id;
            const wallet = page?.properties?.Wallet?.title?.[0]?.plain_text;
            const total =
              page?.properties?.["Total Pts"]?.number ??
              page?.properties?.Total?.number ??
              0;
            const checksum =
              page?.properties?.Checksum?.rich_text?.[0]?.plain_text ?? null;
            if (pid && typeof wallet === "string") {
              notionExistingPages.set(wallet.toLowerCase(), {
                pageId: pid,
                totalPts: typeof total === "number" ? total : 0,
                checksum: typeof checksum === "string" ? checksum : null,
              });
              fetched += 1;
            }
          }
        } while (cursor);
        console.log("[superfluid-stack] Notion existing pages fetched", {
          count: fetched,
        });
      } catch (error) {
        console.error("[superfluid-stack] Failed to read Notion database", {
          error,
        });
      }

      console.log("[superfluid-stack] Syncing wallet points to Notion", {
        count: walletBreakdown.length,
      });
      const batchSize = 3;
      const delayMs = 350;
      const seen = new Set<string>();
      try {
        for (let i = 0; i < walletBreakdown.length; i += batchSize) {
          const batch = walletBreakdown.slice(i, i + batchSize);
          console.log("[superfluid-stack] Notion batch start", {
            batchStart: i,
            batchEnd: i + batch.length - 1,
            batchSize: batch.length,
          });
          const results = await Promise.all(
            batch.map((wallet) => {
              seen.add(wallet.address.toLowerCase());
              // Skip update if checksum matches existing
              const existing = notionExistingPages.get(
                wallet.address.toLowerCase(),
              );
              if (existing?.checksum === wallet.checksum) return true;
              return upsertNotionWallet({
                address: wallet.address,
                fundPoints: wallet.fundPoints,
                streamPoints: wallet.streamPoints,
                superfluidActivityPoints: wallet.superfluidActivityPoints,
                governanceStakePoints: wallet.governanceStakePoints,
                farcasterPoints: wallet.farcasterPoints,
                totalPoints: wallet.totalPoints,
              });
            }),
          );
          results.forEach((ok) => {
            notionSync.processed += 1;
            if (!ok) notionSync.failed += 1;
          });
          console.log("[superfluid-stack] Notion batch complete", {
            processed: notionSync.processed,
            failed: notionSync.failed,
            remaining: walletBreakdown.length - notionSync.processed,
          });
          if (i + batchSize < walletBreakdown.length) {
            await sleep(delayMs); // Stay under Notion rate limits
          }
        }
        // Archive rows no longer present
        const toArchive: string[] = [];
        for (const [wallet, entry] of notionExistingPages.entries()) {
          if (!seen.has(wallet)) toArchive.push(entry.pageId);
        }
        for (const pageId of toArchive) {
          await notionClient.pages.update({ page_id: pageId, archived: true });
        }
        if (toArchive.length) {
          console.log("[superfluid-stack] Notion archived removed rows", {
            archived: toArchive.length,
          });
        }
      } catch (error) {
        console.error("[superfluid-stack] Notion sync failure", error);
        notionSync.failed += walletBreakdown.length - notionSync.processed;
      }
      notionSync.success = notionSync.failed === 0;
    } else {
      if (!notionSync.attempted) {
        console.log("[superfluid-stack] Skipping Notion sync", {
          hasClient: Boolean(notionClient),
          hasDbId: Boolean(NOTION_DB_ID_TRIMMED),
          notionDisabled,
        });
      }
    }

    if (pointsSnapshotPromise) {
      responsePointsCid = await pointsSnapshotPromise;
    }

    const pinned = await flushCaches();
    responseCreationCid = pinned.creationBlockCacheCid;
    responseTransferCid = pinned.transferLogCacheCid;
    pinnedPriceCacheCid = pinned.priceCacheCid ?? pinnedPriceCacheCid;
    responseRunLogsCid = await pinRunLogsToIpfs(runLogBuffer);
    logPinnedArtifacts({
      pointsSnapshotCid: responsePointsCid,
      runLogsCid: responseRunLogsCid,
    });
    console.log = originalConsole.log;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;

    return NextResponse.json(
      {
        csv: walletBreakdownCsv,
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
        notionSync,
        farcasterFollowerWallets,
        fetchedPricesByChain,
        streamTotalsByChain,
        creationBlockCacheCid:
          responseCreationCid ?? latestCreationBlockCacheCid ?? null,
        transferLogCacheCid:
          responseTransferCid ?? latestTransferLogCacheCid ?? null,
        priceCacheCid: pinned.priceCacheCid ?? latestPriceCacheCid ?? null,
        pointsSnapshotCid: responsePointsCid,
        runLogsCid: responseRunLogsCid,
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
    pinnedPriceCacheCid = pinned.priceCacheCid ?? pinnedPriceCacheCid;
    responseRunLogsCid = await pinRunLogsToIpfs(runLogBuffer);
    logPinnedArtifacts({
      pointsSnapshotCid: responsePointsCid,
      runLogsCid: responseRunLogsCid,
    });
    console.log = originalConsole.log;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
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
        runLogsCid: responseRunLogsCid,
      },
      { status: 500 },
    );
  }
}
