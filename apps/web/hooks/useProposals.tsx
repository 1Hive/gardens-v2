import { useContext } from "react";
import { ProposalContext } from "@/providers/ProposalsProvider";

export const useProposals = () => {
  const context = useContext(ProposalContext);
  if (!context) {
    throw new Error("useProposals must be used within a PoolProvider");
  }
  return context;
};
