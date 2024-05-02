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
import { formatTokenAmount } from "@/utils/numbers";
import { getIpfsMetadata } from "@/utils/ipfsUtils";
import * as dn from "dnum";
import {
  calcThresholdPct,
  calcTotalSupport,
  calcCurrentConviction,
} from "@/utils/convictionFormulas";

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
  params: { proposalId: string; poolId: number; chain: number; garden: string };
}) {
  // TODO: fetch garden decimals in query
  const { data: getProposalQuery } = await queryByChain<getProposalDataQuery>(
    urqlClient,
    chain,
    getProposalDataDocument,
    {
      garden: garden,
      proposalId: proposalId,
    },
  );

  const proposalData = getProposalQuery?.cvproposal;

  if (!proposalData) {
    return (
      <p className="text-center text-2xl text-error">{`Proposal ${proposalId} not found`}</p>
    );
  }

  const tokenSymbol = getProposalQuery?.tokenGarden?.symbol;
  const proposalIdNumber = proposalData.proposalNumber as number;
  // const convictionLast = proposalData.convictionLast as string;
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
  let getProposal: any = [];
  let maxCVSupply = 0n;

  try {
    totalEffectiveActivePoints = (await client.readContract({
      ...cvStrategyContract,
      functionName: "totalEffectiveActivePoints",
    })) as bigint;
    getProposalStakedAmount = (await client.readContract({
      ...cvStrategyContract,
      functionName: "getProposalStakedAmount",
      args: [proposalIdNumber],
    })) as bigint;
    getProposal = await client.readContract({
      ...cvStrategyContract,
      functionName: "getProposal",
      args: [proposalIdNumber],
    });
    maxCVSupply = (await client.readContract({
      ...cvStrategyContract,
      functionName: "getMaxConviction",
      args: [totalEffectiveActivePoints],
    })) as bigint;
  } catch (error) {
    console.log(error);
    return (
      <div className="text-center text-error">{`Syntax error!, check above functions arguments`}</div>
    );
  }
  const tokenDecimals = 18;

  const updatedConvictionLast = getProposal[7] ?? 0;

  const thresholdPct = calcThresholdPct(threshold, maxCVSupply, tokenDecimals);
  const totalSupport = calcTotalSupport(
    getProposalStakedAmount,
    totalEffectiveActivePoints,
    tokenDecimals,
  );
  const currentConviction = calcCurrentConviction(
    updatedConvictionLast,
    maxCVSupply,
    tokenDecimals,
  );

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
        <div>Alpha test number</div>
        <div className="flex flex-col gap-8">
          <div>
            <p className="text-xl">
              This proposal need{" "}
              <span className="text-2xl text-secondary">{thresholdPct}%</span>{" "}
              of pool conviction to pass
            </p>
          </div>
          <div>
            <p className="text-xl">
              Total support is :{" "}
              <span className="text-2xl text-secondary">{totalSupport}%</span>{" "}
            </p>
          </div>
          <div>
            <p className="text-xl">
              Current conviction is:{" "}
              <span className="text-4xl text-info">{currentConviction}%</span>{" "}
            </p>
          </div>
        </div>

        {/* PROPOSAL NUMBERS CHART  */}
        <div className="mt-10 flex justify-evenly">
          {/* <ConvictionBarChart
            currentConviction={calcCurrCon as number}
            maxConviction={calcMaxConv.toString() as unknown as number}
            threshold={calcThreshold as number}
            // data={calcsResults}
            proposalSupport={50}
          /> */}
        </div>
      </main>
    </div>
  );
}
