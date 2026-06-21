import { NextResponse } from "next/server";
import {
  Address,
  TransactionReceipt,
  createPublicClient,
  decodeEventLog,
  getAddress,
  http,
  isAddress,
} from "viem";
import { getConfigByChain } from "@/configs/chains";
import { cvStrategyABI, safeArbitratorABI } from "@/src/generated";
import { ChainId } from "@/types";
import { getViemChain } from "@/utils/web3";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GARDENS_APP_BASE_URL = "https://app.gardens.fund";
const DISCORD_WEBHOOK_TIMEOUT_MS = 10_000;
const RECENT_NOTIFICATION_TTL_MS = 6 * 60 * 60 * 1000;
const DEFAULT_MAX_RECEIPT_AGE_SECONDS = 6 * 60 * 60;
const DISPUTE_EMBED_COLOR = 0xe5484d;
const WARNING_EMBED_COLOR = 0xf59e0b;

const recentlyNotifiedTxHashes = new Map<string, number>();

type DisputeFeedPayload = {
  chainId?: number | string;
  transactionHash?: string;
  strategyAddress?: string;
  proposalNumber?: string | number;
  proposalTitle?: string | null;
  disputeReason?: string | null;
  proposalPath?: string | null;
};

type ProposalDisputedArgs = {
  arbitrator: Address;
  proposalId: bigint;
  disputeId: bigint;
  challenger: Address;
  context: string;
  timestamp: bigint;
};

type DisputeCreationArgs = {
  _disputeID: bigint;
  _arbitrable: Address;
};

type DecodedEvent<TArgs> = {
  address: Address;
  args: TArgs;
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status });
}

function isHash(value: string | undefined): value is `0x${string}` {
  return /^0x[a-fA-F0-9]{64}$/.test(value ?? "");
}

function normalizeAddress(value: string | undefined): Address | null {
  if (!value || !isAddress(value)) return null;
  return getAddress(value);
}

function sameAddress(left: string | undefined, right: string | undefined) {
  return left?.toLowerCase() === right?.toLowerCase();
}

function truncate(value: string | null | undefined, maxLength: number) {
  const normalized = value?.trim();
  if (!normalized) return null;
  return normalized.length > maxLength ?
      `${normalized.slice(0, maxLength - 1)}...`
    : normalized;
}

function readPositiveNumberEnv(key: string, fallback: number) {
  const value = Number(process.env[key]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function parseOptionalBigInt(value: string | number | undefined) {
  if (value == null) return null;
  try {
    return BigInt(value);
  } catch {
    return undefined;
  }
}

function cleanupRecentNotifications(now = Date.now()) {
  for (const [key, timestamp] of recentlyNotifiedTxHashes) {
    if (now - timestamp > RECENT_NOTIFICATION_TTL_MS) {
      recentlyNotifiedTxHashes.delete(key);
    }
  }
}

function getExplorerTxUrl(explorer: string, transactionHash: string) {
  return `${explorer.replace(/\/$/, "")}/tx/${transactionHash}`;
}

function getExplorerAddressUrl(explorer: string, address: string) {
  return `${explorer.replace(/\/$/, "")}/address/${address}`;
}

function buildProposalUrl(path: string | null | undefined) {
  if (!path?.startsWith("/gardens/")) return null;
  return `${GARDENS_APP_BASE_URL}${path}`;
}

function findDecodedEvent<TArgs>({
  receipt,
  abi,
  eventName,
  address,
}: {
  receipt: TransactionReceipt;
  abi: typeof cvStrategyABI | typeof safeArbitratorABI;
  eventName: string;
  address?: Address;
}): DecodedEvent<TArgs> | null {
  for (const log of receipt.logs) {
    if (address && !sameAddress(log.address, address)) continue;

    try {
      const decoded = decodeEventLog({
        abi,
        data: log.data,
        topics: log.topics,
      });

      if (decoded.eventName === eventName) {
        return {
          address: getAddress(log.address),
          args: decoded.args as TArgs,
        };
      }
    } catch {
      // Logs from other contracts in the same transaction are expected.
    }
  }

  return null;
}

function getTribunalSafeFromDispute(dispute: unknown): Address | null {
  if (Array.isArray(dispute)) {
    const tribunalSafe = dispute[6];
    return typeof tribunalSafe === "string" && isAddress(tribunalSafe) ?
        getAddress(tribunalSafe)
      : null;
  }

  const maybeDispute = dispute as { tribunalSafe?: unknown };
  return typeof maybeDispute.tribunalSafe === "string" &&
    isAddress(maybeDispute.tribunalSafe) ?
      getAddress(maybeDispute.tribunalSafe)
    : null;
}

async function postDiscordWebhook({
  webhookUrl,
  chainName,
  explorerUrl,
  transactionHash,
  proposalUrl,
  proposalTitle,
  proposalNumber,
  strategyAddress,
  disputeId,
  challenger,
  tribunalSafe,
  isGlobalTribunal,
  reason,
}: {
  webhookUrl: string;
  chainName: string;
  explorerUrl: string;
  transactionHash: string;
  proposalUrl: string | null;
  proposalTitle: string | null;
  proposalNumber: string;
  strategyAddress: Address;
  disputeId: bigint;
  challenger: Address;
  tribunalSafe: Address;
  isGlobalTribunal: boolean;
  reason: string | null;
}) {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    DISCORD_WEBHOOK_TIMEOUT_MS,
  );

  const txUrl = getExplorerTxUrl(explorerUrl, transactionHash);
  const strategyUrl = getExplorerAddressUrl(explorerUrl, strategyAddress);
  const challengerUrl = getExplorerAddressUrl(explorerUrl, challenger);
  const tribunalUrl = getExplorerAddressUrl(explorerUrl, tribunalSafe);
  const title = proposalTitle ?? `Proposal #${proposalNumber}`;
  const embedTitle =
    isGlobalTribunal ?
      "🚨 New Global Tribunal dispute"
    : "⚠️ New Tribunal dispute";
  const embedDescription =
    isGlobalTribunal ?
      "A proposal was disputed and routed to the global tribunal."
    : "A proposal was disputed, but it is not assigned to the global tribunal. No action needed.";
  const tribunalLabel = isGlobalTribunal ? "Global Safe" : "Pool Tribunal Safe";

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        username: "Gardens Dispute Feed",
        avatar_url: `${GARDENS_APP_BASE_URL}/favicon.ico`,
        allowed_mentions: { parse: [] },
        embeds: [
          {
            title: embedTitle,
            description: embedDescription,
            color: isGlobalTribunal ? DISPUTE_EMBED_COLOR : WARNING_EMBED_COLOR,
            url: proposalUrl ?? txUrl,
            timestamp: new Date().toISOString(),
            fields: [
              {
                name: "Proposal",
                value:
                  proposalUrl ?
                    `[${title}](${proposalUrl})`
                  : `${title}`,
                inline: false,
              },
              {
                name: "Chain",
                value: chainName,
                inline: true,
              },
              {
                name: "Dispute ID",
                value: disputeId.toString(),
                inline: true,
              },
              {
                name: "Transaction",
                value: `[Open explorer](${txUrl})`,
                inline: true,
              },
              {
                name: "Strategy",
                value: `[${strategyAddress.slice(0, 6)}...${strategyAddress.slice(-4)}](${strategyUrl})`,
                inline: true,
              },
              {
                name: "Challenger",
                value: `[${challenger.slice(0, 6)}...${challenger.slice(-4)}](${challengerUrl})`,
                inline: true,
              },
              {
                name: "Tribunal",
                value: `[${tribunalLabel}](${tribunalUrl})`,
                inline: true,
              },
              {
                name: "Action",
                value:
                  isGlobalTribunal ?
                    "Review required"
                  : "No global tribunal action needed",
                inline: true,
              },
              ...(reason ?
                [
                  {
                    name: "Reason",
                    value: reason,
                    inline: false,
                  },
                ]
              : []),
            ],
            footer: {
              text: "Gardens dispute feed",
            },
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Discord webhook failed with status ${response.status}`);
    }
  } finally {
    clearTimeout(timeout);
  }
}

export async function POST(request: Request) {
  const webhookUrl = process.env.DISPUTE_FEED_DISCORD_WEBHOOK?.trim();
  if (!webhookUrl) {
    return jsonResponse(
      { sent: false, reason: "DISPUTE_FEED_DISCORD_WEBHOOK is not configured" },
      503,
    );
  }

  let payload: DisputeFeedPayload;
  try {
    payload = (await request.json()) as DisputeFeedPayload;
  } catch {
    return jsonResponse({ sent: false, reason: "Invalid JSON payload" }, 400);
  }

  const chainId = payload.chainId;
  const transactionHash = payload.transactionHash;

  if (chainId == null) {
    return jsonResponse({ sent: false, reason: "chainId is required" }, 400);
  }

  if (!isHash(transactionHash)) {
    return jsonResponse(
      { sent: false, reason: "transactionHash must be a 32-byte hash" },
      400,
    );
  }

  const chainConfig = getConfigByChain(chainId as ChainId);
  if (!chainConfig?.rpcUrl) {
    return jsonResponse(
      { sent: false, reason: `Unsupported chain or missing RPC: ${chainId}` },
      400,
    );
  }

  if (!chainConfig.globalTribunal) {
    return jsonResponse(
      { sent: false, reason: `Missing global tribunal for chain ${chainId}` },
      400,
    );
  }

  const configuredArbitrator = normalizeAddress(chainConfig.arbitrator);
  const configuredGlobalTribunal = normalizeAddress(chainConfig.globalTribunal);
  if (!configuredArbitrator || !configuredGlobalTribunal) {
    return jsonResponse(
      { sent: false, reason: "Configured arbitrator or tribunal is invalid" },
      500,
    );
  }

  const publicClient = createPublicClient({
    chain: getViemChain(chainId as ChainId),
    transport: http(chainConfig.rpcUrl),
  });

  let receipt: TransactionReceipt;
  try {
    receipt = await publicClient.getTransactionReceipt({
      hash: transactionHash,
    });
  } catch {
    return jsonResponse(
      { sent: false, reason: "Transaction receipt was not found" },
      400,
    );
  }

  if (receipt.status !== "success") {
    return jsonResponse(
      { sent: false, reason: "Transaction receipt was not successful" },
      400,
    );
  }

  const block = await publicClient.getBlock({ blockNumber: receipt.blockNumber });
  const latestBlock = await publicClient.getBlock({ blockTag: "latest" });
  const maxAgeSeconds = BigInt(
    readPositiveNumberEnv(
      "DISPUTE_FEED_MAX_RECEIPT_AGE_SECONDS",
      DEFAULT_MAX_RECEIPT_AGE_SECONDS,
    ),
  );

  if (latestBlock.timestamp - block.timestamp > maxAgeSeconds) {
    return jsonResponse(
      { sent: false, reason: "Transaction receipt is too old" },
      400,
    );
  }

  const proposalDisputedEvent = findDecodedEvent<ProposalDisputedArgs>({
    receipt,
    abi: cvStrategyABI,
    eventName: "ProposalDisputed",
  });

  if (!proposalDisputedEvent) {
    return jsonResponse(
      { sent: false, reason: "ProposalDisputed event not found" },
      400,
    );
  }

  const strategyAddress = normalizeAddress(proposalDisputedEvent.address);
  const payloadStrategyAddress = normalizeAddress(payload.strategyAddress);

  if (!strategyAddress) {
    return jsonResponse(
      { sent: false, reason: "ProposalDisputed strategy address is invalid" },
      400,
    );
  }

  if (
    payloadStrategyAddress &&
    !sameAddress(payloadStrategyAddress, strategyAddress)
  ) {
    return jsonResponse(
      { sent: false, reason: "Payload strategy does not match receipt event" },
      400,
    );
  }

  if (
    !sameAddress(proposalDisputedEvent.args.arbitrator, configuredArbitrator)
  ) {
    return jsonResponse(
      { sent: false, reason: "Dispute was not created with chain arbitrator" },
      400,
    );
  }

  const payloadProposalNumber = parseOptionalBigInt(payload.proposalNumber);
  if (payloadProposalNumber === undefined) {
    return jsonResponse(
      { sent: false, reason: "Payload proposal number is invalid" },
      400,
    );
  }

  if (
    payloadProposalNumber != null &&
    payloadProposalNumber !== proposalDisputedEvent.args.proposalId
  ) {
    return jsonResponse(
      { sent: false, reason: "Payload proposal does not match receipt event" },
      400,
    );
  }

  const disputeCreationEvent = findDecodedEvent<DisputeCreationArgs>({
    receipt,
    abi: safeArbitratorABI,
    eventName: "DisputeCreation",
    address: configuredArbitrator,
  });

  if (!disputeCreationEvent) {
    return jsonResponse(
      { sent: false, reason: "Arbitrator DisputeCreation event not found" },
      400,
    );
  }

  if (
    disputeCreationEvent.args._disputeID !==
      proposalDisputedEvent.args.disputeId ||
    !sameAddress(disputeCreationEvent.args._arbitrable, strategyAddress)
  ) {
    return jsonResponse(
      { sent: false, reason: "Arbitrator event does not match proposal event" },
      400,
    );
  }

  const dispute = await publicClient.readContract({
    address: configuredArbitrator,
    abi: safeArbitratorABI,
    functionName: "disputes",
    args: [proposalDisputedEvent.args.disputeId - 1n],
  });
  const tribunalSafe = getTribunalSafeFromDispute(dispute);

  if (!tribunalSafe) {
    return jsonResponse(
      { sent: false, reason: "Unable to read dispute tribunal safe" },
      500,
    );
  }

  const isGlobalTribunal = sameAddress(tribunalSafe, configuredGlobalTribunal);

  const notificationKey = `${chainConfig.id}:${transactionHash}`;
  const now = Date.now();
  cleanupRecentNotifications(now);
  if (recentlyNotifiedTxHashes.has(notificationKey)) {
    return jsonResponse(
      { sent: false, reason: "Dispute notification already sent recently" },
      200,
    );
  }

  try {
    await postDiscordWebhook({
      webhookUrl,
      chainName: chainConfig.name,
      explorerUrl: chainConfig.explorer,
      transactionHash,
      proposalUrl: buildProposalUrl(payload.proposalPath),
      proposalTitle: truncate(payload.proposalTitle, 120),
      proposalNumber: proposalDisputedEvent.args.proposalId.toString(),
      strategyAddress,
      disputeId: proposalDisputedEvent.args.disputeId,
      challenger: getAddress(proposalDisputedEvent.args.challenger),
      tribunalSafe,
      isGlobalTribunal,
      reason: truncate(
        payload.disputeReason ?? proposalDisputedEvent.args.context,
        900,
      ),
    });
  } catch (error) {
    return jsonResponse(
      {
        sent: false,
        reason:
          error instanceof Error ?
            error.message
          : "Discord webhook request failed",
      },
      502,
    );
  }

  recentlyNotifiedTxHashes.set(notificationKey, now);

  return jsonResponse({
    sent: true,
    chainId: chainConfig.id,
    transactionHash,
    disputeId: proposalDisputedEvent.args.disputeId.toString(),
    isGlobalTribunal,
  });
}
