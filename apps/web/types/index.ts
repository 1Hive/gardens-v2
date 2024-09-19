import { getPoolDataQuery } from "#/subgraph/.graphclient";

export * from "./styles";

export const PoolTypes: Record<string, "signaling" | "funding" | "streaming"> =
  {
    0: "signaling",
    1: "funding",
    2: "streaming",
  };

export const PointSystems: Record<
  string,
  "fixed" | "capped" | "capped" | "unlimited" | "quadratic"
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

export type ChainId = string | number;

export type LightCVStrategy = getPoolDataQuery["cvstrategies"][number];
export type LightProposal = LightCVStrategy["proposals"][number];

export type SybilResistanceType =
  | "noSybilResist"
  | "gitcoinPassport"
  | "allowList";
