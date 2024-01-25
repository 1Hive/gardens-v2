import { Badge, StatusBadge, Button, StackedBarChart } from "@/components";
import { formatAddress } from "@/utils/formatAddress";
import { honeyIcon } from "@/assets";
import Image from "next/image";
import { alloAbi, cvStrategyAbi } from "@/src/generated";
import { Abi, formatEther } from "viem";
import { readContract } from "@wagmi/core";
import { wagmiConfig } from "@/configs/wagmiConfig";
import { contractsAddresses } from "@/constants/contracts";
import { proposalsMockData } from "@/constants/proposalsMockData";

//getPrposals => thersohold, convictinlast
//totaleeffectiveactivepoints => same
//getMaxConviction => passed to , maxCVsuPPPLY ESTA
//MAX CONVICTION => getprpposalStakedAmount ESTA (proposalid) > maxCVconvciton
//
//updatepRPPOSALcoNVICTION ESTA

type ProposalsMock = {
  title: string;
  type: "funding" | "streaming" | "signaling";
  description: string;
  value?: number;
  id: number;
};

type UnparsedProposal = {
  submitter: `0x${string}`;
  beneficiary: `0x${string}`;
  requestedToken: `0x${string}`;
  requestedAmount: number;
  stakedTokens: number;
  proposalType: any;
  proposalStatus: any;
  blockLast: number;
  convictionLast: number;
  agreementActionId: number;
  threshold: number;
  voterStakedPointsPct: number;
};

type Proposal = UnparsedProposal & ProposalsMock;

type PoolData = {
  profileId: `0x${string}`;
  strategy: `0x${string}`;
  token: `0x${string}`;
  metadata: { protocol: bigint; pointer: string };
  managerRole: `0x${string}`;
  adminRole: `0x${string}`;
};

export default async function Proposal({
  params: { proposalId, poolId },
}: {
  params: { proposalId: number; poolId: number };
}) {
  // const { proposals: proposalSContracts, strategyAddress } = useProposalsRead({
  //   poolId: Number(poolId),
  // });

  // const proposalContract = proposalSContracts?.filter(
  //   (proposal) => proposal.id === Number(proposalId),
  // )[0];

  const poolData = (await readContract(wagmiConfig, {
    address: contractsAddresses.allo,
    abi: alloAbi as Abi,
    functionName: "getPool",
    args: [BigInt(poolId)],
  })) as PoolData;

  const cvStrategyContract = {
    address: poolData.strategy,
    abi: cvStrategyAbi as Abi,
  };

  const rawProposal = (await readContract(wagmiConfig, {
    address: poolData.strategy,
    abi: cvStrategyAbi as Abi,
    functionName: "getProposal",
    args: [proposalId],
  })) as any[];

  const proposal = {
    ...transformData(rawProposal),
    ...proposalsMockData[proposalId],
  };

  const maxCVSupply = await readContract(wagmiConfig, {
    ...cvStrategyContract,
    functionName: "getMaxConviction",
    args: [proposalId],
  });

  const maxCVStaked = await readContract(wagmiConfig, {
    ...cvStrategyContract,
    functionName: "getProposalStakedAmount",
    args: [proposalId],
  });

  const totalEffectiveActivePoints = await readContract(wagmiConfig, {
    ...cvStrategyContract,
    functionName: "totalEffectiveActivePoints",
  });

  // console.log(proposal, maxCVSupply, maxCVStaked, totalEffectiveActivePoints);

  const {
    title,
    type,
    description,
    requestedAmount,
    beneficiary,
    submitter: createdBy,
    threshold,
    convictionLast,
  } = proposal as Proposal;

  const { status, points, supporters } = proposalsMockData?.filter(
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

  const handleDispute = () => {
    console.log("dispute...");
  };

  console.log(status);

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
          <StatusBadge status={status} />
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
          {/* <Button onClick={handleDispute} className="bg-red text-white"> */}
          Dispute
          {/* </Button> */}
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

function transformData(data: any[]): UnparsedProposal {
  return {
    submitter: data[0],
    beneficiary: data[1],
    requestedToken: data[2],
    requestedAmount: Number(data[3]),
    stakedTokens: Number(data[4]),
    proposalType: data[5],
    proposalStatus: data[6],
    blockLast: Number(data[7]),
    convictionLast: Number(data[8]),
    agreementActionId: Number(data[9]),
    threshold: Number(data[10]),
    voterStakedPointsPct: Number(data[11]),
  };
}
