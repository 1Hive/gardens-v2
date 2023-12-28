"use client";
import { useProposals } from "@/hooks/useProposals";
import ProposalView from "@/components/ProposalView";

export default function ProposalId({
  params: { slug },
}: {
  params: { slug: string };
}) {
  const { proposals } = useProposals();
  const proposal = proposals?.filter(
    (proposal) => proposal.id === Number(slug),
  );

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
