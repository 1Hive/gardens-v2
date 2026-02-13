export const QUERY_PARAMS = {
  simulatedWallet: "wallet",
  gardenPage: {
    newCommunity: "newCommunity",
  },
  communityPage: {
    newPool: "newPool",
    covenant: "covenant",
    newCommunity: "newCommunity", // directly on the new community page
  },
  poolPage: {
    newProposal: "newProposal",
    allocationView: "allocationView",
    goodDollar: "goodDollar",
    goodDollarVerified: "verified",
  },
  proposalPage: {
    pendingProposal: "pendingProposal",
    pendingProposalTitle: "pendingProposalTitle",
  },
} as const;
