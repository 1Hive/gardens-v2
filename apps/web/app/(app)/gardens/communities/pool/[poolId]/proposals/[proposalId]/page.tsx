"use client";
import { useProposals } from "@/hooks/useProposals";
import { Badge, Button, StackedBarChart } from "@/components";
import { formatAddress } from "@/utils/formatAddress";
import { useProposalsRead } from "@/hooks/useProposalsRead";
import { honeyIcon } from "@/assets";
import Image from "next/image";

export default function Proposal({
  params: { proposalId, poolId },
}: {
  params: { proposalId: string; poolId: string };
}) {
  const { proposals } = useProposals();
  // const proposal = proposals?.filter(
  //   (proposal) => proposal.id === Number(proposalId),
  // );

  const { proposals: proposalContract } = useProposalsRead({
    poolId: Number(poolId),
  });

  const proposalsReadsContract = proposalContract?.filter(
    (proposal) => proposal.id === Number(proposalId),
  );

  if (proposalsReadsContract.length === 0) {
    // Render loading state or handle the absence of data
    return null;
  }

  const {
    title,
    type,
    description,
    requestedAmount,
    beneficiary,
    submitter: createdBy,
  } = proposalsReadsContract[0];

  const { status, points, supporters } = proposals?.filter(
    (proposal) => proposal.id === Number(proposalId),
  )[0];

  const sumSupportersAmount = () => {
    let sum = 0;
    supporters.forEach((supporter: any) => {
      sum += supporter.amount;
    });
    return sum;
  };

  const supportersTotalAmount = sumSupportersAmount();

  //
  //
  //
  //
  //
  function calculateThreshold(requested, funds, supply, alpha, beta, rho) {
    const share = requested / funds;

    if (share <= beta) {
      return (rho * supply) / (1 - alpha) / (beta - share) ** 2;
    } else {
      return null;
    }
  }

  function getMaxConviction(amount, alpha) {
    const x = amount;
    const a = alpha;
    return x / (1 - a);
  }

  let t;
  let max;
  let supply = 9908.15; // total staked in proposala get it in CV contract
  let alpha = 0.9999799;
  let pool = 11722.22; // getpoolAmount from CVStatrtegy
  t = calculateThreshold(800, pool, supply, alpha, 0.2, 0.001);
  max = getMaxConviction(supply, alpha); //
  console.log("t", t);
  console.log("max", max);
  const th = (t / max) * 100;
  console.log("th", th);
  //for user convert stakedTokens to points 1 point = 1% 100% = 50HNY StakedBasisAmaount IN REGISTRY CONTRACT
  // tokens needed: means u need 5.7 % of the effective supply to pass the proposal => tokens need
  //  contract --- getMaxConviction => we need the alpha, is the decay variable from the contacts, weight is rho,
  //max ratio is beta
  //get max conviction => max conviction possible based on the supply
  //convitinLast is the current conviction fetcn in getPrposals
  // 1% == 1 points
  //updatepRPPOSALcoNVICTION

  const handleDispute = () => {
    console.log("dispute...");
  };
  return (
    <div className="mx-auto flex min-h-screen max-w-7xl gap-3  px-4 sm:px-6 lg:px-8">
      <main className="flex flex-1 flex-col gap-6 rounded-xl border-2 border-black bg-base-100 bg-surface p-16">
        {/* main content */}
        <div className="flex items-center justify-between">
          <Badge type={type} />
          <h4 className="font-press">Pool: {poolId}</h4>
        </div>

        {/* title - description - status */}
        <div className="relative space-y-12 rounded-xl border-2 border-black bg-white px-8 py-4">
          <span className="badge badge-success absolute right-3 top-3">
            {status}
          </span>
          <div className=" flex items-baseline justify-end space-x-4 ">
            <h3 className="w-full text-center text-2xl font-semibold">
              {title}
            </h3>
          </div>
          <div className="">
            <p className="text-md text-justify">{description}</p>
          </div>
          <div>
            {/* reqAmount - bene - creatBy */}
            <div className="flex justify-between">
              {requestedAmount && (
                <div className="flex flex-1 flex-col items-center space-y-4">
                  <span className="text-md underline">Requested Amount</span>
                  <span className="text-md flex items-center gap-2">
                    <Image
                      src={honeyIcon}
                      alt="honey icon"
                      className="h-8 w-8"
                    />
                    {requestedAmount} <span>HNY</span>
                  </span>
                </div>
              )}
              {beneficiary && (
                <div className="flex flex-1 flex-col items-center space-y-4">
                  <span className="text-md underline">Beneficiary</span>
                  <span className="text-md">{formatAddress(beneficiary)}</span>
                </div>
              )}
              {createdBy && (
                <div className="flex flex-1 flex-col items-center space-y-4">
                  <span className="text-md underline">Created By</span>
                  <span className="text-md">{formatAddress(createdBy)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* TODO!: this section */}
        <div className="flex border-2">
          <StackedBarChart {...fundingProposalTest} />
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

const fundingProposalTest: {
  type: "funding" | "streaming" | "signaling";
  cvPoints: number;
  supportingPoints: number;
  neededPoints: number;
  threshold: number;
} = {
  type: "funding",
  cvPoints: 300,
  supportingPoints: 700,
  neededPoints: 600,
  threshold: 1300,
};
