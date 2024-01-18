"use client";
import { useProposals } from "@/hooks/useProposals";
import { Badge, Button, StackedBarChart } from "@/components";
import { formatAddress } from "@/utils/formatAddress";
import { useProposalsRead } from "@/hooks/useProposalsRead";
import { honeyIcon } from "@/assets";
import Image from "next/image";
import { cvStrategyAbi } from "@/src/generated";
import { Abi, formatEther } from "viem";
import { useContractRead } from "wagmi";

//getPrposals => thersohold, convictinlast
//totaleeffectiveactivepoints => same
//getMaxConviction => passed to , maxCVsuPPPLY ESTA
//MAX CONVICTION => getprpposalStakedAmount ESTA (proposalid) > maxCVconvciton
//
//updatepRPPOSALcoNVICTION ESTA

export default function Proposal({
  params: { proposalId, poolId },
}: {
  params: { proposalId: string; poolId: string };
}) {
  const { proposals } = useProposals();

  const { proposals: proposalSContracts, strategyAddress } = useProposalsRead({
    poolId: Number(poolId),
  });

  const proposalContract = proposalSContracts?.filter(
    (proposal) => proposal.id === Number(proposalId),
  )[0];

  const cvStrategyContract = {
    address: strategyAddress,
    abi: cvStrategyAbi as Abi,
  };

  const { data: maxCVSupply } = useContractRead({
    ...cvStrategyContract,
    functionName: "getMaxConviction",
    args: [proposalId],
    onError: (error) => {
      console.log(error);
    },
    onSuccess: (data) => {
      // console.log("maxCVSupply: " + Number(data));
    },
  });

  const { data: maxCVStaked } = useContractRead({
    ...cvStrategyContract,
    functionName: "getProposalStakedAmount",
    args: [proposalId],
    onError: (error) => {
      console.log(error);
    },
    onSuccess: (data) => {
      // console.log("maxCVStaked: " + Number(data));
    },
  });

  const { data: totalEffectiveActivePoints } = useContractRead({
    ...cvStrategyContract,
    functionName: "totalEffectiveActivePoints",
    onError: (error) => {
      console.log(error);
    },
    onSuccess: (data) => {
      // console.log("totalEffectiveActivePoints: " + Number(data));
    },
  });

  if (proposalSContracts.length === 0) {
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
    threshold,
    convictionLast,
  } = proposalContract;

  // console.log("threshold: " + threshold);
  // console.log("convictionLast: " + convictionLast);

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
  const {
    _convictionLast,
    _maxCVStaked,
    _maxCVSupply,
    _threshold,
    _totalEffectiveActivePoints,
  } = mockedPoints;

  const _neededPoints =
    calcThresholdPoints(_threshold, _maxCVSupply, _totalEffectiveActivePoints) -
    calcFutureCvPoints(_maxCVStaked, _maxCVSupply, _totalEffectiveActivePoints);

  // console.log(
  //   "threshold: " +
  //     calcThresholdPoints(
  //       _threshold,
  //       _maxCVSupply,
  //       _totalEffectiveActivePoints,
  //     ),
  // );
  // console.log(
  //   "cvPoints: " +
  //     calcCvPoints(_convictionLast, _maxCVSupply, _totalEffectiveActivePoints),
  // );
  // console.log(
  //   "futureCvPoints: " +
  //     calcFutureCvPoints(
  //       _maxCVStaked,
  //       _maxCVSupply,
  //       _totalEffectiveActivePoints,
  //     ),
  // );

  const fundingProposalTest: {
    type: "funding" | "streaming" | "signaling";
    cvPoints: number;
    supportingPoints: number;
    neededPoints: number;
    threshold: number;
  } = {
    type: "funding",
    cvPoints: calcCvPoints(
      _convictionLast,
      _maxCVSupply,
      _totalEffectiveActivePoints,
    ),
    supportingPoints: calcFutureCvPoints(
      _maxCVStaked,
      _maxCVSupply,
      _totalEffectiveActivePoints,
    ),
    neededPoints: _neededPoints,
    threshold: calcThresholdPoints(
      _threshold,
      _maxCVSupply,
      _totalEffectiveActivePoints,
    ),
  };

  //
  //

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

const mockedPoints = {
  _maxCVSupply: 289034,
  _maxCVStaked: 28903,
  _totalEffectiveActivePoints: 1000,
  _threshold: 57806,
  _convictionLast: 9093,
};

// convictionLast
function calcCvPoints(
  convictionLast: number,
  maxCVSupply: number,
  totalEffectiveActivePoints: number,
) {
  let convictionLastPct = convictionLast / maxCVSupply;
  return convictionLastPct * totalEffectiveActivePoints * 2;
}

// futureConvictionStaked
function calcFutureCvPoints(
  maxCVStaked: number,
  maxCVSupply: number,
  totalEffectiveActivePoints: number,
) {
  let futureConvictionStakedPct = maxCVStaked / maxCVSupply;
  return futureConvictionStakedPct * totalEffectiveActivePoints * 2;
}

// threshold
function calcThresholdPoints(
  threshold: number,
  maxCVSupply: number,
  totalEffectiveActivePoints: number,
) {
  let thresholdPct = threshold / maxCVSupply;
  return thresholdPct * totalEffectiveActivePoints * 2;
}
