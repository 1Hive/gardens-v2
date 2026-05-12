export const FALLBACK_TITLE = "Gardens proposal";
export const ACTIVE_PROPOSAL_DESCRIPTION =
  "This proposal is active and can receive support from members";
export const DISPUTED_PROPOSAL_DESCRIPTION =
  "This proposal is disputed and now going through arbitration.";
export const ENDED_PROPOSAL_DESCRIPTION =
  "This proposal has ended and can no longer receive support.";
export const OG_IMAGE_TOKEN = "opengraph-image";
export const OG_IMAGE_VERSION = "v=3";

type ProposalStatusName =
  | "inactive"
  | "active"
  | "paused"
  | "cancelled"
  | "executed"
  | "disputed"
  | "rejected";

export function getDescriptionFromStatus(status?: ProposalStatusName): string {
  const normalized = status?.toLowerCase() as ProposalStatusName | undefined;
  return (
    normalized === "active" ? ACTIVE_PROPOSAL_DESCRIPTION
    : normalized === "disputed" ? DISPUTED_PROPOSAL_DESCRIPTION
    : ENDED_PROPOSAL_DESCRIPTION
  );
}

export function titleCaseStatus(status?: string): string | undefined {
  if (!status) return undefined;
  const normalized = status.toLowerCase();
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}
