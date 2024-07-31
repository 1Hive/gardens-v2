import { getPoolDataQuery } from "#/subgraph/.graphclient";

export * from "./styles";

export const poolTypes: Record<string, "signaling" | "funding" | "streaming"> =
  {
    0: "signaling",
    1: "funding",
    2: "streaming",
  };

export const pointSystems: Record<
  string,
  "fixed" | "capped" | "capped" | "unlimited" | "quadratic"
> = {
  0: "fixed",
  1: "capped",
  2: "unlimited",
  3: "quadratic",
};

export const proposalStatus: Record<
  string,
  "inactive" | "active" | "disputed" | "cancelled" | "executed"
> = {
  0: "inactive",
  1: "active",
  2: "disputed",
  3: "cancelled",
  4: "executed",
};

export type ChainId = string | number;

export type LightCVStrategy = getPoolDataQuery["cvstrategies"][number];
export type LightProposal = LightCVStrategy["proposals"][number];
