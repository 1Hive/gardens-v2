import { SuperBanner, SuperLogo, GoodDollarLogo } from "@/assets";

export type CampaignId = "1" | "2" | "3";

export interface CampaignConfig {
  id: CampaignId;
  name: string;
  description: string;
  tokenAllocated: number;
  tokenSymbol: string;
  endDate: string;
  banner: any;
  logo: any;
  leaderboardEndpoint: string;
}

export const CAMPAIGNS = {
  "1": {
    id: 7859,
    name: "Superfluid Ecosystem Rewards Season 4",
    description:
      "Earn SUP rewards by staking governance tokens, adding funds to pools, and following Gardens on Farcaster.",
    tokenSymbol: "SUP",
    endDate: "25 Feb 2026",
    banner: SuperBanner,
    logo: SuperLogo,
    leaderboardEndpoint: "/api/superfluid-points/leaderboard?campaignId=7859",
  },
  "2": {
    id: 7856,
    name: "GoodDollar on Gardens Season 4",
    description:
      "Earn SUP tokens by adding $G to funding pools and staking in communities that allocate G$ in pools.",
    tokenSymbol: "SUP",
    endDate: "25 Feb 2026",
    banner: SuperBanner,
    logo: GoodDollarLogo,
    leaderboardEndpoint: "/api/superfluid-points-gd/leaderboard",
  },
  "3": {
    id: 510,
    name: "Superfluid Ecosystem Rewards Season 5",
    description:
      "Earn SUP rewards by staking governance tokens, adding funds to pools, and following Gardens on Farcaster.",
    tokenSymbol: "SUP",
    endDate: "1 Jun 2026",
    banner: SuperBanner,
    logo: SuperLogo,
    leaderboardEndpoint: "/api/superfluid-points/leaderboard",
  },
} as const;

export function isCampaignActive(
  endDate: string,
  referenceTimestamp = Date.now(),
) {
  const endDateTimestamp = Date.parse(endDate);

  if (Number.isNaN(endDateTimestamp)) {
    return false;
  }

  return endDateTimestamp >= referenceTimestamp;
}
