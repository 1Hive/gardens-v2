export * from "./styles";

export const proposalTypes: Record<string, string> = {
  0: "signaling",
  1: "funding",
  2: "streaming",
};

export const proposalStatus: Record<string, string> = {
  0: "inactive",
  1: "active",
  2: "paused",
  3: "cancelled",
  4: "executed",
};
