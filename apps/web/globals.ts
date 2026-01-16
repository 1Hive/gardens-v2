export const CHANGE_EVENT_INITIAL_DELAY = 2000;
export const CHANGE_EVENT_MAX_RETRIES = 10; // Max retries for change event subscription
export const CHANGE_EVENT_CHANNEL_NAME = "change-events";
export const NOTIFICATION_AUTO_CLOSE_DELAY = 4000;
export const ONE_HIVE_COMMUNITY_ADDRESS =
  "0xe2396fe2169ca026962971d3b2e373ba925b6257".toLowerCase();

export const DEFAULT_RULING_TIMEOUT_SEC = +(
  (process.env.NEXT_PUBLIC_DEFAULT_RULING_TIMEOUT ?? 604800) // 7 days
);
export const VOTING_POINT_SYSTEM_DESCRIPTION = {
  fixed: "Everyone has the same voting weight",
  capped: "Voting weight is equal to tokens staked, up to a limit",
  unlimited: "Voting weight is equal to tokens staked, no limit.",
  quadratic:
    "Voting weight is the square root of staked tokens, reducing power of bigger holders.",
} as const;

export const NFTs = {
  FirstHolder: "0x0c04af0f06d5762151245d0b7ef48170c49a1441",
  Protopian: [
    "0xCCac0bc52BF35d8F72d8dBEb780EEB9A4C1C5433",
    (tokenId: string) => tokenId.startsWith("2") || tokenId.startsWith("6"),
  ],
  Keeper: [
    "0xCCac0bc52BF35d8F72d8dBEb780EEB9A4C1C5433",
    (tokenId: string) => tokenId.startsWith("1"),
  ],
} as const;
