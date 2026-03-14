const PROPOSAL_PREFIX = "proposal-";

export function buildProposalEntityId(
  strategyAddress: string,
  proposalSegment: string,
): string {
  if (!proposalSegment) {
    return "";
  }

  const normalizedProposal = proposalSegment.toLowerCase();

  if (normalizedProposal.startsWith(PROPOSAL_PREFIX)) {
    const proposalNumber = extractProposalNumber(normalizedProposal);
    return `${strategyAddress.toLowerCase()}-${proposalNumber}`;
  }

  if (normalizedProposal.includes("-")) {
    return normalizedProposal;
  }

  return `${strategyAddress.toLowerCase()}-${normalizedProposal}`;
}

export function extractProposalNumber(proposalSegment: string): string {
  if (!proposalSegment) {
    return "";
  }

  if (!proposalSegment.includes("-")) {
    return proposalSegment;
  }

  const parts = proposalSegment.split("-");
  return parts[parts.length - 1] ?? proposalSegment;
}

export function formatProposalSlug(
  proposalSegment: string | number | undefined,
): string {
  const proposalString =
    proposalSegment != null ? proposalSegment.toString() : "";
  const proposalNumber = extractProposalNumber(proposalString);

  if (!proposalNumber) {
    return PROPOSAL_PREFIX.slice(0, -1);
  }

  return `${PROPOSAL_PREFIX}${proposalNumber}`;
}
