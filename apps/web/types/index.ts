import { getPoolDataQuery } from "#/subgraph/.graphclient";

export * from "./styles";

export const poolTypes: Record<string, string> = {
  0: "signaling",
  1: "funding",
  2: "streaming",
};

export const pointSystems: Record<string, string> = {
  0: "fixed",
  1: "capped",
  2: "unlimited",
  3: "quadratic",
};

export const proposalStatus: Record<string, string> = {
  0: "inactive",
  1: "active",
  2: "in dispute",
  3: "cancelled",
  4: "executed",
};

export type ChainId = string | number;

export type LightCVStrategy = getPoolDataQuery["cvstrategies"][0];
export type LightProposal = LightCVStrategy["proposals"][0];
