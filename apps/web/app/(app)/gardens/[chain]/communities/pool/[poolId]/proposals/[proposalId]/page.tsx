import { Badge, StatusBadge } from "@/components";
import { formatAddress } from "@/utils/formatAddress";
import { honeyIcon } from "@/assets";
import Image from "next/image";
import { alloABI, cvStrategyABI } from "@/src/generated";
import { Abi, createPublicClient, http } from "viem";
import { contractsAddresses } from "@/constants/contracts";
import { proposalsMockData } from "@/constants/proposalsMockData";
import { getChain } from "@/configs/chainServer";

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
  params: { proposalId, poolId, chain },
}: {
  params: { proposalId: number; poolId: number; chain: number };
}) {
  const client = createPublicClient({
    chain: getChain(chain),
    transport: http(),
  });

  const poolData = (await client.readContract({
    abi: alloABI,
    address: contractsAddresses.allo,
    functionName: "getPool",
    args: [BigInt(poolId)],
  })) as PoolData;

  const cvStrategyContract = {
    address: poolData.strategy,
    abi: cvStrategyABI as Abi,
  };

  const rawProposal = (await client.readContract({
    address: poolData.strategy,
    abi: cvStrategyABI as Abi,
    functionName: "getProposal",
    args: [proposalId],
  })) as any[];

  const proposal = {
    ...transformData(rawProposal),
    ...proposalsMockData[proposalId],
  };

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

  const totalEffectiveActivePoints = (await client.readContract({
    ...cvStrategyContract,
    functionName: "totalEffectiveActivePoints",
  })) as bigint;

  const getProposalStakedAmount = await client.readContract({
    ...cvStrategyContract,
    functionName: "getProposalStakedAmount",
    args: [proposalId],
    blockTag: "latest",
  });

  console.log(getProposalStakedAmount);

  const maxCVSupply = (await client.readContract({
    ...cvStrategyContract,
    functionName: "getMaxConviction",
    args: [totalEffectiveActivePoints],
    blockTag: "latest",
  })) as bigint;

  console.log(maxCVSupply);
  // => d

  const maxCVStaked = (await client.readContract({
    ...cvStrategyContract,
    functionName: "getMaxConviction",
    args: [getProposalStakedAmount],
    blockTag: "latest",
  })) as bigint;

  console.log(maxCVStaked);

  //CALCS WITH CONTRACTS DATA
  const currentConviction = calcCurrentConviction(
    9093,
    maxCVSupply,
    totalEffectiveActivePoints as bigint,
  );

  const futureConviction = calcFutureConviction(
    28903,
    maxCVSupply,
    totalEffectiveActivePoints as bigint,
  );

  const deductedFutureConvictionResult = calcDeductedFutureConviction(
    9093,
    28903,
    maxCVSupply,
    totalEffectiveActivePoints,
  );

  const calcThreshold = calcThresholdPoints(
    threshold,
    maxCVSupply,
    totalEffectiveActivePoints as bigint,
  );

  const pointNeeded = calcPointsNeeded(
    calcThreshold,
    28903,
    maxCVSupply,
    totalEffectiveActivePoints,
  );

  console.log("proposalStakedAmount", getProposalStakedAmount);

  //Params
  console.log("maxCVSupply", maxCVSupply);
  console.log("maxCVStaked", maxCVStaked);
  console.log("convictionLast", convictionLast);
  console.log("rawThreshold", threshold);
  console.log("points needed", pointNeeded);

  //Formulas Result worked
  console.log("currentConviction", currentConviction);
  console.log("futureConviction", futureConviction);
  console.log("futureConvi", deductedFutureConvictionResult);
  console.log("threshold", calcThreshold);

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
        <div className="flex border-2"></div>
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

// convictionLast
function calcCurrentConviction(
  convictionLast: number | bigint,
  maxCVSupply: number | bigint,
  totalEffectiveActivePoints: number | bigint,
): number | string {
  // Check if convictionLast, maxCVSupply, and totalEffectiveActivePoints are non-negative integers
  if (
    !Number.isInteger(Number(convictionLast)) ||
    !Number.isInteger(Number(maxCVSupply)) ||
    !Number.isInteger(Number(totalEffectiveActivePoints)) ||
    convictionLast < 0 ||
    maxCVSupply <= 0 ||
    totalEffectiveActivePoints < 0
  ) {
    return "Invalid input. All parameters must be non-negative integers.";
  }

  // Check if maxCVSupply is greater than convictionLast to avoid division by zero
  if (maxCVSupply <= convictionLast) {
    return "Invalid input. maxCVSupply must be greater than convictionLast.";
  }

  // Calculate the percentage of the convictionLast relative to the maximum CV supply
  const convictionLastPct = Number(convictionLast) / Number(maxCVSupply);

  // Calculate the current conviction points based on the percentage and total effective active points
  const result = convictionLastPct * Number(totalEffectiveActivePoints) * 2;

  // Round up to the nearest integer with no decimals
  return Math.floor(result);
}

// futureConvictionStaked
function calcFutureConviction(
  maxCVStaked: number | bigint,
  maxCVSupply: number | bigint,
  totalEffectiveActivePoints: number | bigint,
): number | string {
  // Check if maxCVStaked, maxCVSupply, and totalEffectiveActivePoints are non-negative integers
  if (
    !Number.isInteger(Number(maxCVStaked)) ||
    !Number.isInteger(Number(maxCVSupply)) ||
    !Number.isInteger(Number(totalEffectiveActivePoints)) ||
    maxCVStaked < 0 ||
    maxCVSupply <= 0 ||
    totalEffectiveActivePoints < 0
  ) {
    return "Invalid input. All parameters must be non-negative integers.";
  }

  // Check if maxCVSupply /maxCVStaked is not zero to avoid division by zero
  if (maxCVSupply === 0) {
    return "Invalid input. maxCVSupply must be non-zero.";
  }
  if (maxCVStaked === 0) {
    return "Invalid input. maxCVStaked must be non-zero.";
  }

  // Calculate the percentage of future conviction staked relative to the maximum CV supply
  const futureConvictionStakedPct = (Number(maxCVStaked) /
    Number(maxCVSupply)) as number;

  // Calculate the future conviction points based on the percentage and total effective active points
  const result =
    futureConvictionStakedPct * Number(totalEffectiveActivePoints) * 2;

  // Round up to the nearest integer with no decimals
  return Math.floor(result);
}

function calcDeductedFutureConviction(
  convictionLast: number | bigint,
  maxCVStaked: number | bigint,
  maxCVSupply: number | bigint,
  totalEffectiveActivePoints: number | bigint,
): number | string {
  // Calculate the current conviction
  const currentConviction = calcCurrentConviction(
    convictionLast,
    maxCVSupply,
    totalEffectiveActivePoints,
  );

  // Calculate the future conviction
  const futureConviction = calcFutureConviction(
    maxCVStaked,
    maxCVSupply,
    totalEffectiveActivePoints,
  );

  // Check if results are valid numbers
  if (
    typeof currentConviction !== "number" ||
    typeof futureConviction !== "number"
  ) {
    return "Invalid input. Conviction results must be numbers.";
  }

  // Deduct the current conviction from the future conviction
  const deductedFutureConviction = futureConviction - currentConviction;

  // Round up to the nearest integer with no decimals
  return Math.floor(deductedFutureConviction);
}

function calcPointsNeeded(
  threshold: number | string,
  maxCVStaked: number | bigint,
  maxCVSupply: number | bigint,
  totalEffectiveActivePoints: number | bigint,
): number | string {
  // Calculate the future conviction
  const futureConviction = calcFutureConviction(
    maxCVStaked,
    maxCVSupply,
    totalEffectiveActivePoints,
  );

  // Check if threshold and futureConviction are valid numbers
  if (typeof threshold !== "number" || typeof futureConviction !== "number") {
    return "Invalid input. Threshold and future conviction must be numbers.";
  }

  // Calculate the points needed (difference between threshold and future conviction)
  const pointsNeeded = threshold - futureConviction;

  // Round up to the nearest integer with no decimals
  return Math.ceil(pointsNeeded);
}

// threshold // OKK ///
function calcThresholdPoints(
  threshold: number | bigint,
  maxCVSupply: number | bigint,
  totalEffectiveActivePoints: number | bigint,
): number | string {
  // Check if threshold, maxCVSupply, and totalEffectiveActivePoints are non-negative integers
  if (
    !Number.isInteger(Number(threshold)) ||
    !Number.isInteger(Number(maxCVSupply)) ||
    !Number.isInteger(Number(totalEffectiveActivePoints)) ||
    threshold < 0 ||
    maxCVSupply <= 0 ||
    totalEffectiveActivePoints < 0
  ) {
    return "Invalid input. All parameters must be non-negative integers.";
  }

  // Check if maxCVSupply > threshold to avoid division by zero
  if (maxCVSupply <= threshold) {
    return "Invalid input. maxCVSupply must be greater than threshold.";
  }

  // Calculate the percentage of the threshold relative to the maximum CV supply
  const thresholdPct = Number(threshold) / Number(maxCVSupply);

  // Calculate the threshold points based on the percentage and total effective active points
  const result = thresholdPct * Number(totalEffectiveActivePoints) * 2;

  // Round up to the nearest integer with no decimals
  return Math.ceil(result);
}

//
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
