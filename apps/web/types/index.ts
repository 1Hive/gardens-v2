export * from "./styles";

export const PoolTypes: Record<string, "signaling" | "funding" | "streaming"> =
  {
    0: "signaling",
    1: "funding",
    2: "streaming",
  };

export const PointSystems: Record<
  string,
  "fixed" | "capped" | "unlimited" | "quadratic"
> = {
  0: "fixed",
  1: "capped",
  2: "unlimited",
  3: "quadratic",
};

export const ProposalStatus: Record<
  string,
  | "inactive"
  | "active"
  | "paused"
  | "cancelled"
  | "executed"
  | "disputed"
  | "rejected"
> = {
  0: "inactive", // Proposal is not active
  1: "active", // Proposal is active
  2: "paused", // Proposal is paused
  3: "cancelled", // Proposal has been cancelled by creator
  4: "executed", // Proposal has passed and be executed
  5: "disputed", // Proposal is currently disputed
  6: "rejected", // Proposal dispute outcome was rejected
};

export const DisputeStatus: Record<string, "waiting" | "solved"> = {
  0: "waiting",
  1: "solved",
};

export const DisputeOutcome: Record<
  string,
  "abstained" | "approved" | "rejected"
> = {
  0: "abstained",
  1: "approved",
  2: "rejected",
};

export type ChainId = number | string;

export type SybilResistanceType =
  | "noSybilResist"
  | "gitcoinPassport"
  | "allowList"
  | "goodDollar";

export type Column<T> = {
  header: string | React.ReactNode;
  render: (item: T) => React.ReactNode;
  className?: string;
};

export type WalletEntry = {
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
  [key: string]: any; // for flexibility
};

export type LeaderboardResponse = {
  cid: string;
  snapshot: {
    updatedAt: string;
    wallets: WalletEntry[];
  };
  totalStreamedSup: number;
  targetStreamSup: number;
};

/**
 * Fetch Superfluid leaderboard data and sort wallets by totalPoints DESC.
 * Returns `null` on any failure.
 */
export async function fetchSuperfluidLeaderboard(): Promise<LeaderboardResponse | null> {
  try {
    const response = await fetch("/api/superfluid-stack/leaderboard", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      console.error(
        "[fetchSuperfluidLeaderboard] Request failed",
        response.status,
        response.statusText,
      );
      return null;
    }

    const data = (await response.json()) as LeaderboardResponse;

    if (!data?.snapshot?.wallets) return data ?? null;

    // SORT HERE
    const sortedWallets = [...data.snapshot.wallets].sort(
      (a, b) => (b.totalPoints ?? 0) - (a.totalPoints ?? 0),
    );

    return {
      ...data,
      snapshot: {
        ...data.snapshot,
        wallets: sortedWallets,
      },
    };
  } catch (error) {
    console.error("[fetchSuperfluidLeaderboard] Unexpected error:", error);
    return null;
  }
}
