"use client";
import { useProposals } from "@/hooks/useProposals";
import { Badge, Button } from "@/components";
import { formatAddress } from "@/utils/formatAddress";

export default function Proposal({
  params: { proposalId },
}: {
  params: { proposalId: string };
}) {
  const { proposals } = useProposals();
  // const proposal = proposals?.filter(
  //   (proposal) => proposal.id === Number(proposalId),
  // );

  const {
    id,
    title,
    type,
    description,
    status,
    requestedAmount,
    beneficiary,
    createdBy,
    points,
    supporters,
  } = proposals?.filter((proposal) => proposal.id === Number(proposalId))[0];

  const sumSupportersAmount = () => {
    let sum = 0;
    supporters.forEach((supporter: any) => {
      sum += supporter.amount;
    });
    return sum;
  };

  const supportersTotalAmount = sumSupportersAmount();

  const handleDispute = () => {
    console.log("dispute...");
  };
  return (
    <div className="mx-auto flex min-h-screen max-w-7xl gap-3  px-4 sm:px-6 lg:px-8">
      <main className="flex flex-1 flex-col gap-6 rounded-xl border-2 border-black bg-base-100 bg-surface p-16">
        {/* main content */}
        <Badge type={type} />

        {/* title - description - status */}
        <div className="relative space-y-10 rounded-xl border-2 border-black bg-white p-8">
          <span className="badge badge-success absolute right-3 top-3">
            {status}
          </span>
          <div className=" flex items-baseline justify-end space-x-4 ">
            <h4 className="w-full text-center text-xl font-semibold">
              {title}
            </h4>
          </div>
          <div className="">
            <p className="text-md text-start">{description}</p>
          </div>
          <div>
            {/* reqAmount - bene - creatBy */}
            <div className="flex justify-between">
              {requestedAmount && (
                <div className="flex flex-1 flex-col items-center">
                  <span className="text-md">Requested Amount</span>
                  <span className="text-md">{requestedAmount}</span>
                </div>
              )}
              {beneficiary && (
                <div className="flex flex-1 flex-col items-center">
                  <span className="text-md">Beneficiary</span>
                  <span className="text-md">{formatAddress(beneficiary)}</span>
                </div>
              )}
              {createdBy && (
                <div className="flex flex-1 flex-col items-center">
                  <span className="text-md">Created By</span>
                  <span className="text-md">{formatAddress(createdBy)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* TODO!: this section */}
        <div className="flex h-64 items-center justify-center border-2">
          div for chart and stuff
        </div>
        {/* Support - Remove buttons */}
        <div className="mt-20 flex justify-evenly">
          <Button onClick={handleDispute} className="bg-red text-white">
            Dispute
          </Button>
        </div>
      </main>

      {/* aside - supporters info address + amount */}
      <aside className="sapce-y-4 sticky top-3 flex h-fit w-[320px] flex-col rounded-xl border-2 border-black bg-base-100 bg-surface px-[38px] py-6">
        <h4 className="border-b-2 border-dashed py-4 text-center text-xl font-semibold">
          Supporters
        </h4>
        <div className="mt-10 space-y-8">
          {supporters.map((supporter: any) => (
            <div className="flex justify-between" key={supporter.address}>
              <span>{formatAddress(supporter.address)}</span>
              <span>{supporter.amount}</span>
            </div>
          ))}
          <div className="flex justify-between py-6">
            <span>Total</span>
            <span>{supportersTotalAmount ?? ""}</span>
          </div>
        </div>
      </aside>
    </div>
  );
}
