import { SuperBanner, SuperLogo, GoodDollarLogo } from "@/assets";

export type CampaignId = "1" | "2";

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
    id: "1",
    name: "Superfluid Ecosystem Rewards",
    description:
      "Earn SUP rewards by staking governance tokens, adding funds to pools, and following Gardens on Farcaster.",
    tokenAllocated: 847_000,
    tokenSymbol: "SUP",
    endDate: "25 Feb 2026",
    banner: SuperBanner,
    logo: SuperLogo,
    leaderboardEndpoint: "/api/superfluid-stack/leaderboard",
  },
  "2": {
    id: "2",
    name: "GoodDollar on Gardens",
    description:
      "Earn SUP tokens by adding $G to funding pools and staking in communities using G$",
    tokenAllocated: 837_370,
    tokenSymbol: "SUP",
    endDate: "25 Feb 2026",
    banner: SuperBanner,
    logo: GoodDollarLogo,
    leaderboardEndpoint: "/api/superfluid-stack-gd/leaderboard",
  },
} as const;
