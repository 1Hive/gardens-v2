import { Badge, StatusBadge } from "@/components";
import { formatAddress } from "@/utils/formatAddress";
import { honeyIcon } from "@/assets";
import Image from "next/image";
import { alloABI, cvStrategyABI } from "@/src/generated";
import { Abi, Address, createPublicClient, http } from "viem";
import { getContractsAddrByChain } from "@/constants/contracts";
import { proposalsMockData } from "@/constants/proposalsMockData";
import { getChain } from "@/configs/chainServer";
import { ConvictionBarChart } from "@/components/Charts/ConvictionBarChart";
import { initUrqlClient, queryByChain } from "@/providers/urql";
import {
  getAlloDocument,
  getAlloQuery,
  getProposalDataDocument,
  getProposalDataQuery,
} from "#/subgraph/.graphclient";

export const dynamic = "force-dynamic";

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

type ProposalMetadata = {
  title: string;
  description: string;
};

const { urqlClient } = initUrqlClient();

export default async function Proposal({
  params: { proposalId, poolId, chain, garden },
}: {
  params: { proposalId: number; poolId: number; chain: number; garden: string };
}) {
  const { data: getProposalQuery } = await queryByChain<getProposalDataQuery>(
    urqlClient,
    chain,
    getProposalDataDocument,
    { poolId: poolId, proposalId: proposalId, garden: garden },
  );

  if (
    !getProposalQuery?.tokenGarden?.communities?.[0].strategies?.[0]
      .proposals?.[0]
  ) {
    return <div>{`Proposal ${proposalId} not found`}</div>;
  }

  const proposalData =
    getProposalQuery?.tokenGarden?.communities?.[0].strategies?.[0]
      .proposals?.[0];
  // console.log("proposalData", proposalData);

  const convictionLast = proposalData.convictionLast;
  const totalStakedTokens = proposalData.stakedTokens;
  // const maxCVSupply = proposalData.
  // const totalEffectiveActivePoints = proposalData.
  const threshold = proposalData.threshold;
  const type = proposalData.strategy.config?.proposalType as number;
  const requestedAmount = proposalData.requestedAmount;
  const beneficiary = proposalData.beneficiary;
  const submitter = proposalData.submitter;
  const status = proposalData.proposalStatus as number;
  const metadata = proposalData.metadata;

  // console.log(metadata);
  //@todo: ipfs fetch

  const getIpfsData = (ipfsHash: string) =>
    fetch(`https://ipfs.io/ipfs/${ipfsHash}`, {
      method: "GET",
      headers: {
        "content-type": "application/json",
      },
    });

  let title = "";
  let description = "";

  try {
    const rawProposalMetadata = await getIpfsData(metadata);
    const proposalMetadata: ProposalMetadata = await rawProposalMetadata.json();
    title = proposalMetadata.title;
    description = proposalMetadata.description;
  } catch (error) {
    console.log(error);
  }

  const client = createPublicClient({
    chain: getChain(chain),
    transport: http(),
  });

  // const addrs = getContractsAddrByChain(chain);
  // if (!addrs) {
  // return <div>Chain ID: {chain} not supported</div>;
  // }//@todo create a function to check suuported chains and return a message with error or redirect

  // console.log("strategyAddr", proposalData.strategy.id);
  const cvStrategyContract = {
    address: proposalData.strategy.id as Address,
    abi: cvStrategyABI as Abi,
  };

  const totalEffectiveActivePoints = (await client.readContract({
    ...cvStrategyContract,
    functionName: "totalEffectiveActivePoints",
  })) as bigint;

  const maxCVSupply = (await client.readContract({
    ...cvStrategyContract,
    functionName: "getMaxConviction",
    args: [totalEffectiveActivePoints],
  })) as bigint;

  // // => D = 10**7

  const maxCVStaked = (await client.readContract({
    ...cvStrategyContract,
    functionName: "getMaxConviction",
    args: [totalStakedTokens],
  })) as bigint;

  //function to get all other function results
  const calcThreshold = calcThresholdPoints(
    threshold,
    maxCVSupply,
    totalEffectiveActivePoints as bigint,
  );

  const calcsResults = executeAllFunctions(
    convictionLast,
    maxCVStaked,
    maxCVSupply,
    totalEffectiveActivePoints,
    threshold,
    calcThreshold,
  );
  const proposalSupport = Number(totalStakedTokens) * 2;

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
              {submitter && (
                <div className="flex flex-1 flex-col items-center space-y-4">
                  <span className="text-md underline">Created By</span>
                  <span className="text-md">{formatAddress(submitter)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* PROPOSAL CHART  */}
        <div className="mt-10 flex justify-evenly">
          <ConvictionBarChart
            data={calcsResults}
            proposalSupport={proposalSupport}
          />
        </div>
      </main>

      {/* aside - supporters info address + amount */}
      {/* <aside className="sapce-y-4 sticky top-3 flex h-fit w-[320px] flex-col rounded-xl border-2 border-black bg-base-100 bg-surface px-[38px] py-6">
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
      </aside> */}
    </div>
  );
}

function validateInput(input: any) {
  return Number.isInteger(Number(input)) && input >= 0;
}

function calcCurrentConviction(
  convictionLast: number | bigint,
  maxCVSupply: number | bigint,
  totalEffectiveActivePoints: number | bigint,
): number | Error {
  if (
    !validateInput(convictionLast) ||
    !validateInput(maxCVSupply) ||
    !validateInput(totalEffectiveActivePoints) ||
    convictionLast < 0 ||
    maxCVSupply <= 0 ||
    totalEffectiveActivePoints < 0
  ) {
    throw new Error(
      "Invalid input. All parameters must be non-negative integers.",
    );
  }
  if (maxCVSupply <= convictionLast) {
    throw new Error(
      "Invalid input. maxCVSupply must be greater than convictionLast.",
    );
  }
  const convictionLastPct = Number(convictionLast) / Number(maxCVSupply);
  const result = convictionLastPct * Number(totalEffectiveActivePoints) * 2;
  return Math.floor(result);
}

function calcMaxConviction(
  maxCVStaked: number | bigint,
  maxCVSupply: number | bigint,
  totalEffectiveActivePoints: number | bigint,
): number | Error {
  if (
    !validateInput(maxCVStaked) ||
    !validateInput(maxCVSupply) ||
    !validateInput(totalEffectiveActivePoints) ||
    maxCVStaked < 0 ||
    maxCVSupply <= 0 ||
    totalEffectiveActivePoints < 0
  ) {
    throw new Error(
      "Invalid input. All parameters must be non-negative integers.",
    );
  }
  if (maxCVSupply === 0 || maxCVStaked === 0) {
    throw new Error(
      "Invalid input. maxCVSupply and maxCVStaked must be non-zero.",
    );
  }
  const futureConvictionStakedPct = Number(maxCVStaked) / Number(maxCVSupply);
  const result =
    futureConvictionStakedPct * Number(totalEffectiveActivePoints) * 2;
  return Math.floor(result);
}

function calcFutureConviction(
  convictionLast: number | bigint,
  maxCVStaked: number | bigint,
  maxCVSupply: number | bigint,
  totalEffectiveActivePoints: number | bigint,
): number | Error {
  const currentConviction = calcCurrentConviction(
    convictionLast,
    maxCVSupply,
    totalEffectiveActivePoints,
  );
  const futureConviction = calcMaxConviction(
    maxCVStaked,
    maxCVSupply,
    totalEffectiveActivePoints,
  );
  if (
    typeof currentConviction !== "number" ||
    typeof futureConviction !== "number"
  ) {
    throw new Error("Invalid input. Conviction results must be numbers.");
  }
  const deductedFutureConviction = futureConviction - currentConviction;
  return Math.floor(deductedFutureConviction);
}

function calcPointsNeeded(
  threshold: number | string,
  maxCVStaked: number | bigint,
  maxCVSupply: number | bigint,
  totalEffectiveActivePoints: number | bigint,
): number | Error {
  const maxConviction = calcMaxConviction(
    maxCVStaked,
    maxCVSupply,
    totalEffectiveActivePoints,
  );
  if (typeof threshold !== "number" || typeof maxConviction !== "number") {
    throw new Error(
      "Invalid input. Threshold and future conviction must be numbers.",
    );
  }
  const pointsNeeded = threshold - maxConviction;
  return Math.ceil(pointsNeeded);
}

function calcThresholdPoints(
  threshold: number | bigint,
  maxCVSupply: number | bigint,
  totalEffectiveActivePoints: number | bigint,
): number {
  if (
    !validateInput(threshold) ||
    !validateInput(maxCVSupply) ||
    !validateInput(totalEffectiveActivePoints) ||
    threshold < 0 ||
    maxCVSupply <= 0 ||
    totalEffectiveActivePoints < 0
  ) {
    return 1;
  }
  if (maxCVSupply <= threshold) {
    throw new Error(
      "Invalid input. maxCVSupply must be greater than threshold.",
    );
  }
  const thresholdPct = Number(threshold) / Number(maxCVSupply);
  const result = thresholdPct * Number(totalEffectiveActivePoints) * 2;
  return Math.ceil(result);
}

type ExecutionResults = {
  currentConviction?: number | Error;
  maxConviction?: number | Error;
  futureConviction?: number | Error;
  pointsNeeded?: number | Error;
  thresholdPoints?: number | Error;
  error?: Error;
};
function executeAllFunctions(
  convictionLast: number | bigint,
  maxCVStaked: number | bigint,
  maxCVSupply: number | bigint,
  totalEffectiveActivePoints: number | bigint,
  threshold: number,
  calcThreshold: number,
) {
  // Initialize an object to store all results
  const results: ExecutionResults = {};

  // Call each function and store the results
  results.currentConviction = calcCurrentConviction(
    convictionLast,
    maxCVSupply,
    totalEffectiveActivePoints,
  );
  results.maxConviction = calcMaxConviction(
    maxCVStaked,
    maxCVSupply,
    totalEffectiveActivePoints,
  );
  results.futureConviction = calcFutureConviction(
    convictionLast,
    maxCVStaked,
    maxCVSupply,
    totalEffectiveActivePoints,
  );
  results.thresholdPoints = calcThresholdPoints(
    threshold,
    maxCVSupply,
    totalEffectiveActivePoints,
  );
  results.pointsNeeded = threshold;

  // calcPointsNeeded(
  //   calcThreshold,
  //   maxCVStaked,
  //   maxCVSupply,
  //   totalEffectiveActivePoints,
  // );

  // Return the results object
  return results;
}

// Example usage

//
// function transformData(data: any[]): UnparsedProposal {
//   return {
//     submitter: data[0],
//     beneficiary: data[1],
//     requestedToken: data[2],
//     requestedAmount: Number(data[3]),
//     stakedTokens: Number(data[4]),
//     proposalType: data[5],
//     proposalStatus: data[6],
//     blockLast: Number(data[7]),
//     convictionLast: Number(data[8]),
//     agreementActionId: Number(data[9]),
//     threshold: Number(data[10]),
//     voterStakedPointsPct: Number(data[11]),
//   };
// }
