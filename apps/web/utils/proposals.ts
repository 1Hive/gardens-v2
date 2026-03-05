export function buildProposalEntityId(
  strategyAddress: string,
  proposalSegment: string,
): string {
  if (!proposalSegment) {
    return "";
  }

  const normalizedProposal = proposalSegment.toLowerCase();
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
