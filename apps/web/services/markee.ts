import { Address } from "viem";

export type MarkeeIntegrationStatus =
  | "not_integrated"
  | "creating"
  | "active"
  | "failed";

export type CommunityMarkeeResponse = {
  integration: {
    status: MarkeeIntegrationStatus;
    leaderboardAddress: Address | null;
    vaultAddress: Address | null;
  };
  leaderboard: {
    maxMessageLength: string;
    maxNameLength: string;
    message: string;
    name: string;
    minimumMonthlyRate: string;
    topMarkeeAddress: Address | null;
    topMarkeeOwner: Address | null;
    topRate: string;
  };
  markeeChainId: number;
  preview: boolean;
  revenue: {
    claimableAmount: string;
    symbol: "ETH";
  };
};

export type MarkeeClaimQuoteResponse = {
  quoteId?: string;
  maxFeeAmount?: string;
  bridgeProtocol: "across" | "lifi" | "none" | "squid";
  bridged: boolean;
  claimAmount: string;
  destinationSymbol: string;
  estimatedFeeAmount: string;
  estimatedRouteDurationSeconds?: number;
  estimatedNetworkFeeAmount: string;
  expectedAmountOut: string;
  expiresAt: number;
  markeeChainId: number;
  recipient: Address;
  symbol: "ETH";
};

export type MarkeeClaimBridgeStatusResponse = {
  axelarTransactionUrl: string | null;
  destinationTransactionUrl: string | null;
  elapsedTimeSeconds: number | null;
  sourceTransactionUrl: string | null;
  status:
    | "awaiting_delivery"
    | "needs_gas"
    | "not_found"
    | "ongoing"
    | "partial_success"
    | "refund"
    | "success"
    | "unknown";
};

export class MarkeeApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly retryable: boolean,
    readonly code?: string,
  ) {
    super(message);
    this.name = "MarkeeApiError";
  }
}

export async function fetchMarkeeJson<T>(url: string, signal?: AbortSignal) {
  const response = await fetch(url, { cache: "no-store", signal });
  const body = (await response.json()) as T & {
    error?: unknown;
    retryable?: unknown;
    code?: unknown;
  };

  if (!response.ok) {
    throw new MarkeeApiError(
      typeof body.error === "string" ?
        body.error
      : "Unable to load Markee data.",
      response.status,
      typeof body.retryable === "boolean" ?
        body.retryable
      : response.status >= 500 || response.status === 429,
      typeof body.code === "string" ? body.code : undefined,
    );
  }

  return body;
}
