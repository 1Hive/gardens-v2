import { SuperBanner, SuperLogo, GoodDollarLogo } from "@/assets";

export type CampaignId = "1" | "2" | "3" | "4";

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
    tokenAllocated: 847_000,
    description:
      "Earn SUP rewards by staking governance tokens, adding funds to pools, and following Gardens on Farcaster.",
    tokenSymbol: "SUP",
    endDate: "25 Feb 2026",
    banner: SuperBanner,
    logo: SuperLogo,
    leaderboardEndpoint: "/api/superfluid-points/leaderboard",
  },
  "2": {
    id: 7856,
    name: "GoodDollar on Gardens Season 4",
    tokenAllocated: 837_370,
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
    tokenAllocated: 519_000,
    description:
      "Earn SUP rewards by staking governance tokens, adding funds to pools, and following Gardens on Farcaster.",
    tokenSymbol: "SUP",
    endDate: "1 Jun 2026",
    banner: SuperBanner,
    logo: SuperLogo,
    leaderboardEndpoint: "/api/superfluid-points/leaderboard?campaignId=510",
  },
  "4": {
    id: 607,
    name: "Superfluid Ecosystem Rewards Season 6",
    tokenAllocated: 510_000,
    description:
      "Earn SUP rewards by staking governance tokens, adding funds to pools, following Gardens on Farcaster, and earning triple points in Streaming pools.",
    tokenSymbol: "SUP",
    endDate: "31 Aug 2026",
    banner: SuperBanner,
    logo: SuperLogo,
    leaderboardEndpoint: "/api/superfluid-points/leaderboard?campaignId=607",
  },
} as const;

export function getLatestCampaignId(): CampaignId {
  const campaignIds = Object.keys(CAMPAIGNS) as CampaignId[];

  if (campaignIds.length === 0) {
    throw new Error("No campaigns configured");
  }

  return String(Math.max(...campaignIds.map(Number))) as CampaignId;
}

const MONTHS_BY_NAME: Record<string, number> = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dec: 11,
};

/**
 * Parses campaign end dates so date-only strings remain active through the end
 * of the listed UTC day. Other formats fall back to the platform Date parser.
 */
function parseCampaignEndDate(endDate: string) {
  const trimmedEndDate = endDate.trim();
  const dateOnlyMatch = trimmedEndDate.match(/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})$/);

  if (dateOnlyMatch) {
    const [, dayValue, monthValue, yearValue] = dateOnlyMatch;
    const monthIndex = MONTHS_BY_NAME[monthValue.toLowerCase()];

    if (monthIndex === undefined) {
      return Number.NaN;
    }

    return Date.UTC(
      Number(yearValue),
      monthIndex,
      Number(dayValue),
      23,
      59,
      59,
      999,
    );
  }

  return Date.parse(trimmedEndDate);
}

export function isCampaignActive(
  endDate: string,
  referenceTimestamp = Date.now(),
) {
  const endDateTimestamp = parseCampaignEndDate(endDate);

  if (Number.isNaN(endDateTimestamp)) {
    return false;
  }

  return endDateTimestamp >= referenceTimestamp;
}
