export const POOL_OG_FALLBACK_TITLE = "Pool";

export const getPoolOgDescriptionText = (
  poolType: "signaling" | "funding" | "streaming" | undefined | null,
) => {
  switch (poolType) {
    case "signaling":
      return "Where collective coordination meets community sentiment.";
    case "funding":
      return "For collective resource allocation and project support.";
    default:
      return "A Gardens pool for collective decision-making and funding.";
  }
};
