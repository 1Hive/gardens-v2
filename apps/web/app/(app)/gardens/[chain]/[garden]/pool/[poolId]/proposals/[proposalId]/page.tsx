import { Badge, StatusBadge } from "@/components";
import { EthAddress } from "@/components";
import { cvStrategyABI } from "@/src/generated";
import { Abi, Address, createPublicClient, http } from "viem";
import { getChain } from "@/configs/chainServer";
import { ConvictionBarChart } from "@/components/Charts/ConvictionBarChart";
import { initUrqlClient, queryByChain } from "@/providers/urql";
import {
  getProposalDataDocument,
  getProposalDataQuery,
} from "#/subgraph/.graphclient";
import { PRECISION_SCALE } from "@/actions/getProposals";
import { formatTokenAmount } from "@/utils/numbers";
import * as dn from "dnum";
import { getIpfsMetadata } from "@/utils/ipfsUtils";

export const dynamic = "force-dynamic";

type ProposalsMock = {
  title: string;
  type: "funding" | "streaming" | "signaling";
  description: string;
  value?: number;
  id: number;
};

type UnparsedProposal = {
  submitter: Address;
  beneficiary: Address;
  requestedToken: Address;
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

const { urqlClient } = initUrqlClient();

const prettyTimestamp = (timestamp: number) => {
  const date = new Date(timestamp * 1000);

  const day = date.getDate();
  const month = date.toLocaleString("default", { month: "short" });
  const year = date.getFullYear();

  return `${day} ${month} ${year}`;
};

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

  const proposalData = getProposalQuery?.cvproposal;

  if (!proposalData) {
    return <div>{`Proposal ${proposalId} not found`}</div>;
  }

  const tokenSymbol = getProposalQuery?.tokenGarden?.symbol;
  const convictionLast = proposalData.convictionLast as string;
  const threshold = proposalData.threshold;
  const type = proposalData.strategy.config?.proposalType as number;
  const requestedAmount = proposalData.requestedAmount as bigint;
  const beneficiary = proposalData.beneficiary as Address;
  const submitter = proposalData.submitter as Address;
  const status = proposalData.proposalStatus as number;
  const metadata = proposalData.metadata;

  const { title, description } = await getIpfsMetadata(metadata);

  const client = createPublicClient({
    chain: getChain(chain),
    transport: http(),
  });

  const cvStrategyContract = {
    address: proposalData.strategy.id as Address,
    abi: cvStrategyABI as Abi,
  };

  let totalEffectiveActivePoints = 0n;
  let getProposalStakedAmount = 0n;
  let rawThresholdFromContract = 0n;
  let updateConvictionLast = 0n;
  let getProposal = 0n;
  let maxCVSupply = 0n;
  let maxCVStaked = 0n;
  let getProposalVoterStake = 0n;

  try {
    totalEffectiveActivePoints = (await client.readContract({
      ...cvStrategyContract,
      functionName: "totalEffectiveActivePoints",
    })) as bigint;

    getProposalStakedAmount = (await client.readContract({
      ...cvStrategyContract,
      functionName: "getProposalStakedAmount",
      args: [proposalId],
    })) as bigint;

    rawThresholdFromContract = (await client.readContract({
      ...cvStrategyContract,
      functionName: "calculateThreshold",
      args: [requestedAmount],
    })) as bigint;

    updateConvictionLast = (await client.readContract({
      ...cvStrategyContract,
      functionName: "updateProposalConviction",
      args: [proposalId],
    })) as bigint;

    getProposal = (await client.readContract({
      ...cvStrategyContract,
      functionName: "getProposal",
      args: [proposalId],
    })) as bigint;

    maxCVSupply = (await client.readContract({
      ...cvStrategyContract,
      functionName: "getMaxConviction",
      args: [totalEffectiveActivePoints],
    })) as bigint;

    maxCVStaked = (await client.readContract({
      ...cvStrategyContract,
      functionName: "getMaxConviction",
      args: [getProposalStakedAmount],
    })) as bigint;

    getProposalVoterStake = (await client.readContract({
      ...cvStrategyContract,
      functionName: "getProposalVoterStake",
      args: [proposalId, "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"],
    })) as bigint;
  } catch (error) {
    console.log(error);
    return (
      <div className="text-center">{`Data of proposal ${proposalId} not found`}</div>
    );
  }

  //the amount of points of the voter manuelly added
  console.log(getProposalVoterStake);
  console.log(requestedAmount);
  console.log(rawThresholdFromContract);
  console.log(totalEffectiveActivePoints);
  console.log(maxCVSupply);
  console.log(maxCVStaked);
  console.log(threshold);
  console.log(updateConvictionLast);
  console.log(convictionLast);
  console.log(getProposalStakedAmount);

  const maxCVSupplyNum = Number(maxCVSupply / PRECISION_SCALE);
  const maxCVStakedNum = Number(maxCVStaked / PRECISION_SCALE);
  const convictionLastNum = Number(
    updateConvictionLast / PRECISION_SCALE,
  ).toFixed(0);
  const pointsNum = Number(totalEffectiveActivePoints / PRECISION_SCALE);
  const tokenStakedNum = getProposalStakedAmount / PRECISION_SCALE;

  console.log("ConvictionLast", convictionLastNum);
  console.log("staked tokens", tokenStakedNum);
  console.log("maxCVSupply", maxCVSupplyNum);
  console.log("maxCVStaked", maxCVStakedNum);

  //Formulas
  const calcThreshold = calcThresholdPoints(
    rawThresholdFromContract,
    maxCVSupply,
    totalEffectiveActivePoints as bigint,
  );

  const calcMaxConv = calcMaxConviction(
    maxCVStakedNum,
    maxCVSupplyNum,
    pointsNum,
  );
  const calcCurrCon = calcCurrentConviction(
    convictionLastNum as unknown as number,
    maxCVSupplyNum,
    pointsNum,
  );

  //values
  const th = BigInt(calcThreshold) / PRECISION_SCALE;
  console.log(calcThreshold);
  console.log("Threshold", th);
  console.log("MaxConviction", calcMaxConv);
  console.log("currentConviction", calcCurrCon);
  console.log("support", tokenStakedNum);

  const proposalSupport = Number(tokenStakedNum);

  return (
    <div className="mx-auto flex min-h-screen max-w-7xl gap-3  px-4 sm:px-6 lg:px-8">
      <main className="flex flex-1 flex-col gap-6 rounded-xl border-2 border-black bg-base-100 bg-surface p-16">
        {/* main content */}
        <div className="flex justify-between">
          <div className="flex items-center gap-2">
            <Badge type={type} />
            <h4 className="font-sm font-bold">
              <span className="">
                {" "}
                {prettyTimestamp(proposalData?.createdAt || 0)}
              </span>
            </h4>
          </div>

          <h4 className="font-press">Pool: {poolId}</h4>
        </div>

        {/* title - description - status */}
        <div className="border2 relative space-y-12 rounded-xl bg-white px-8 py-4">
          <div className="flex justify-end">
            <StatusBadge status={status} />
          </div>
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
            <div className="flex justify-between ">
              {!!requestedAmount && (
                <div className="flex flex-1 flex-col items-center space-y-4">
                  <span className="text-md font-bold underline">
                    Requested Amount
                  </span>
                  <span className="flex items-center gap-2 text-lg">
                    {formatTokenAmount(requestedAmount, 18)}{" "}
                    <span>{tokenSymbol}</span>
                  </span>
                </div>
              )}
              {beneficiary && (
                <div className="flex flex-1 flex-col items-center space-y-4">
                  <span className="text-md font-bold underline">
                    Beneficiary
                  </span>
                  <EthAddress address={beneficiary} actions="copy" />
                </div>
              )}
              {submitter && (
                <div className="flex flex-1 flex-col items-center space-y-4">
                  <span className="text-md font-bold underline">
                    Created By
                  </span>
                  <EthAddress address={submitter} actions="copy" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* PROPOSAL NUMBERS CHART  */}
        <div className="mt-10 flex justify-evenly">
          <ConvictionBarChart
            currentConviction={calcCurrCon as number}
            maxConviction={calcMaxConv.toString() as unknown as number}
            threshold={th as unknown as number}
            // data={calcsResults}
            proposalSupport={proposalSupport}
          />
        </div>
      </main>
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
): number {
  if (
    !validateInput(convictionLast) ||
    !validateInput(maxCVSupply) ||
    !validateInput(totalEffectiveActivePoints) ||
    convictionLast < 0 ||
    maxCVSupply <= 0 ||
    totalEffectiveActivePoints < 0
  ) {
    console.log("Invalid input. All parameters must be non-negative integers.");
  }
  if (maxCVSupply <= convictionLast) {
    console.log(
      "Invalid input. maxCVSupply must be greater than convictionLast.",
    );
  }
  const convictionLastPct = Number(convictionLast) / Number(maxCVSupply);
  console.log(convictionLastPct);
  const result = convictionLastPct * Number(totalEffectiveActivePoints);
  console.log(result);
  return Math.floor(result);
}

function calcMaxConviction(
  maxCVStaked: number | bigint,
  maxCVSupply: number | bigint,
  totalEffectiveActivePoints: number | bigint,
): number {
  if (
    !validateInput(maxCVStaked) ||
    !validateInput(maxCVSupply) ||
    !validateInput(totalEffectiveActivePoints) ||
    maxCVStaked < 0 ||
    maxCVSupply <= 0 ||
    totalEffectiveActivePoints < 0
  ) {
    console.log("Invalid input. All parameters must be non-negative integers.");
  }
  if (maxCVSupply === 0 || maxCVStaked === 0) {
    console.log("Invalid input. maxCVSupply and maxCVStaked must be non-zero.");
  }
  const futureConvictionStakedPct = Number(maxCVStaked) / Number(maxCVSupply);
  const result = futureConvictionStakedPct * Number(totalEffectiveActivePoints);
  return Math.floor(result);
}

function calcFutureConviction(
  convictionLast: number | bigint,
  maxCVStaked: number | bigint,
  maxCVSupply: number | bigint,
  totalEffectiveActivePoints: number | bigint,
): number {
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
    console.log("Invalid input. Conviction results must be numbers.");
  }
  const deductedFutureConviction = futureConviction - currentConviction;
  return Math.floor(deductedFutureConviction);
}

function calcPointsNeeded(
  threshold: number | string,
  maxCVStaked: number | bigint,
  maxCVSupply: number | bigint,
  totalEffectiveActivePoints: number | bigint,
): number {
  const maxConviction = calcMaxConviction(
    maxCVStaked,
    maxCVSupply,
    totalEffectiveActivePoints,
  );
  if (typeof threshold !== "number" || typeof maxConviction !== "number") {
    console.log(
      "Invalid input. Threshold and future conviction must be numbers.",
    );
  }
  const pointsNeeded = Number(threshold) - maxConviction;
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
    console.log("Invalid input. maxCVSupply must be greater than threshold.");
  }

  const thresholdPct = Number(threshold) / Number(maxCVSupply);

  const result = thresholdPct * Number(totalEffectiveActivePoints);
  return Math.ceil(result);
}

type ExecutionResults = {
  currentConviction?: number;
  maxConviction?: number;
  futureConviction?: number;
  pointsNeeded?: number;
  thresholdPoints?: number;
};

function executeAllFunctions(
  convictionLast: number | bigint,
  maxCVStaked: number | bigint,
  maxCVSupply: number | bigint,
  totalEffectiveActivePoints: number | bigint,
  threshold: number,
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

  return results;
}
