export const DEFAULT_RULING_TIMEOUT_SEC = +(
  (process.env.NEXT_PUBLIC_DEFAULT_RULING_TIMEOUT ?? 604800) // 7 days
);
export const VOTING_POINT_SYSTEM_DESCRIPTION = {
  fixed: "Everyone has the same voting weight, limited to registration stake",
  capped: "Voting weight is equal to tokens staked, up to a limit",
  unlimited: "Voting weight is equal to tokens staked, no limit.",
  quadratic:
    "Voting weight increases as more tokens are staked, following a quadratic curve.",
} as const;

export const cheats = [
  "showArchived",
  "bypassSafeCheck",
  "allowNoProtection",
  "skipPublished",
  "queryAllChains",
];
