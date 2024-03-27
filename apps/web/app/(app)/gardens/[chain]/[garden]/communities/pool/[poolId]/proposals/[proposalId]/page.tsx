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
type ProposalMetadata = {
  title: string;
  description: string;
};

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
  const convictionLast = proposalData.convictionLast;
  const totalStakedTokens = proposalData.stakedTokens;
  const threshold = proposalData.threshold;
  const type = proposalData.strategy.config?.proposalType as number;
  const requestedAmount = proposalData.requestedAmount;
  const beneficiary = proposalData.beneficiary as Address;
  const submitter = proposalData.submitter as Address;
  const status = proposalData.proposalStatus as number;
  const metadata = proposalData.metadata;

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
    title = proposalMetadata?.title || "No title found";
    description = proposalMetadata?.description || "No description found";
  } catch (error) {
    console.log(error);
  }

  const client = createPublicClient({
    chain: getChain(chain),
    transport: http(),
  });

  const cvStrategyContract = {
    address: proposalData.strategy.id as Address,
    abi: cvStrategyABI as Abi,
  };

  const totalEffectiveActivePoints = (await client.readContract({
    ...cvStrategyContract,
    functionName: "totalEffectiveActivePoints",
  })) as bigint;

  console.log(totalEffectiveActivePoints);

  const getProposalStakedAmount = (await client.readContract({
    ...cvStrategyContract,
    functionName: "getProposalStakedAmount",
    args: [proposalId],
  })) as bigint;

  const rawThresholdFromContract = (await client.readContract({
    ...cvStrategyContract,
    functionName: "calculateThreshold",
    args: [requestedAmount],
  })) as bigint;

  //amount in token the proposal was staked 1token = 2% in points
  //in the example each memeber staked 50 tokens = 100%
  console.log(getProposalStakedAmount);

  const updateConvictionLast = (await client.readContract({
    ...cvStrategyContract,
    functionName: "updateProposalConviction",
    args: [proposalId],
  })) as bigint;
  console.log(updateConvictionLast);

  const getTotalVoterStakePct = (await client.readContract({
    ...cvStrategyContract,
    functionName: "getTotalVoterStakePct",
    args: ["0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"],
  })) as bigint;

  const getProposal = (await client.readContract({
    ...cvStrategyContract,
    functionName: "getProposal",
    args: [proposalId],
  })) as bigint;
  console.log(getProposal);

  const maxCVSupply = (await client.readContract({
    ...cvStrategyContract,
    functionName: "getMaxConviction",
    args: [totalEffectiveActivePoints],
  })) as bigint;

  const getProposalAllStaked =
    Number(getProposalStakedAmount * BigInt(2) * PRECISION_SCALE) / 10 ** 18;
  console.log(getProposalAllStaked);

  const manualStaked = 1000000n;

  const maxCVStaked = (await client.readContract({
    ...cvStrategyContract,
    functionName: "getMaxConviction",
    args: [manualStaked],
  })) as bigint;
  console.log(maxCVStaked);

  const getProposalVoterStake = (await client.readContract({
    ...cvStrategyContract,
    functionName: "getProposalVoterStake",
    args: [proposalId, "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"],
  })) as bigint;

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
    updateConvictionLast / BigInt(10 ** 18),
  ).toFixed(0);

  const effPointsNum = Number(totalEffectiveActivePoints / PRECISION_SCALE);
  const tokenStakedNum = getProposalStakedAmount / PRECISION_SCALE;

  console.log(tokenStakedNum);

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
  const calcMaxConv = calcMaxConviction(maxCVStakedNum, maxCVSupplyNum, 1000);
  const calcCurrCon = calcCurrentConviction(
    convictionLastNum as unknown as number,
    maxCVSupplyNum,
    1000,
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
              {requestedAmount && (
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
  console.log(convictionLastPct);
  const result = convictionLastPct * Number(totalEffectiveActivePoints) * 2;
  console.log(result);
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
    return 0;
    // throw new Error(
    //   "Invalid input. maxCVSupply and maxCVStaked must be non-zero.",
    // );
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
