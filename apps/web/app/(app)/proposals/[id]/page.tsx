"use client";
import { useProposals } from "@/hooks/useProposals";
import ProposalView from "@/components/ProposalView";

export default function ProposalId({
  params: { id },
}: {
  params: { id: string };
}) {
  const { proposals } = useProposals();
  const proposal = proposals?.filter((proposal) => proposal.id === Number(id));
  console.log(proposal);

  return (
    <div>
      {proposal.map((proposal) => (
        <>
          <ProposalView {...proposal} />
        </>
      ))}
    </div>
  );
}
