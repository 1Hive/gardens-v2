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
  bridged: boolean;
  claimAmount: string;
  estimatedFeeAmount: string;
  estimatedNetworkFeeAmount: string;
  expiresAt: number;
  markeeChainId: number;
  recipient: Address;
  symbol: "ETH";
};

export async function fetchMarkeeJson<T>(url: string, signal?: AbortSignal) {
  const response = await fetch(url, { cache: "no-store", signal });
  const body = (await response.json()) as T & { error?: unknown };

  if (!response.ok) {
    throw new Error(
      typeof body.error === "string" ?
        body.error
      : "Unable to load Markee data.",
    );
  }

  return body;
}
