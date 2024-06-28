import { Badge, Statistic, DisplayNumber } from "@/components";
import { EthAddress } from "@/components";
import { cvStrategyABI } from "@/src/generated";
import { Abi, Address, createPublicClient, formatUnits, http } from "viem";
import { getChain } from "@/configs/chainServer";
import { ConvictionBarChart } from "@/components/Charts/ConvictionBarChart";
import { initUrqlClient, queryByChain } from "@/providers/urql";
import {
  getProposalDataDocument,
  getProposalDataQuery,
} from "#/subgraph/.graphclient";
import { formatTokenAmount, calculatePercentageBigInt } from "@/utils/numbers";
import Image from "next/image";
import { getIpfsMetadata } from "@/utils/ipfsUtils";
import { UserIcon, InformationCircleIcon } from "@heroicons/react/24/outline";
import { proposalStatus, poolTypes } from "@/types";
import { proposalImg } from "@/assets";

export const dynamic = "force-dynamic";

// export const EMPTY_BENEFICIARY = "0x0000000000000000000000000000000000000000";

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
  const tokenDecimals = getProposalQuery?.tokenGarden?.decimals;
  const proposalIdNumber = proposalData.proposalNumber as number;
  const convictionLast = proposalData.convictionLast as string;
  const threshold = proposalData.threshold as bigint;
  const proposalType = proposalData.strategy.config?.proposalType as number;
  const requestedAmount = proposalData.requestedAmount as bigint;
  const beneficiary = proposalData.beneficiary as Address;
  const submitter = proposalData.submitter as Address;
  const status = proposalData.proposalStatus as number;
  const stakedAmount = proposalData.stakedAmount as bigint;
  const metadata = proposalData.metadata;

  const isSignalingType = poolTypes[proposalType] == "signaling";

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
  let updateConvictionLast = 0n;
  let getProposal: any = [];
  let maxCVSupply = 0n;
  let thFromContract = 0n;
  let stakeAmountFromContract = 0n;

  try {
    if (!isSignalingType) {
      thFromContract = (await client.readContract({
        ...cvStrategyContract,
        functionName: "calculateThreshold",
        args: [proposalIdNumber],
      })) as bigint;
    }
  } catch (error) {
    console.log(error);
  }

  try {
    totalEffectiveActivePoints = (await client.readContract({
      ...cvStrategyContract,
      functionName: "totalEffectiveActivePoints",
    })) as bigint;

    stakeAmountFromContract = (await client.readContract({
      ...cvStrategyContract,
      functionName: "getProposalStakedAmount",
      args: [proposalIdNumber],
    })) as bigint;
    getProposal = await client.readContract({
      ...cvStrategyContract,
      functionName: "getProposal",
      args: [proposalIdNumber],
    });
    updateConvictionLast = (await client.readContract({
      ...cvStrategyContract,
      functionName: "updateProposalConviction",
      args: [proposalIdNumber],
    })) as bigint;
    maxCVSupply = (await client.readContract({
      ...cvStrategyContract,
      functionName: "getMaxConviction",
      args: [totalEffectiveActivePoints],
    })) as bigint;
  } catch (error) {
    updateConvictionLast = getProposal[7] as bigint;
    console.log(
      "proposal already executed so threshold can no be read from contracts, or it is siganling proposal",
      error,
    );
  }

  //logs for debugging in arb sepolia - //TODO: remove before merge
  console.log("requesteAmount:              %s", requestedAmount);
  console.log("maxCVSupply:                 %s", maxCVSupply);
  //thresholda
  // console.log(threshold);
  console.log("threshold:                   %s", threshold);
  // console.log(thFromContract);
  console.log("thFromContract:              %s", thFromContract);
  //stakeAmount
  // console.log(stakedAmount);
  console.log("stakedAmount:                %s", stakedAmount);
  // console.log(stakeAmountFromContract);
  console.log("stakeAmountFromContract:     %s", stakeAmountFromContract);
  // console.log(totalEffectiveActivePoints);
  console.log("totalEffectiveActivePoints:  %s", totalEffectiveActivePoints);
  // console.log(updateConvictionLast);
  console.log("updateConvictionLast:        %s", updateConvictionLast);
  // console.log(convictionLast);
  console.log("convictionLast:              %s", convictionLast);

  const thresholdPct = calculatePercentageBigInt(
    threshold,
    maxCVSupply,
    tokenDecimals,
  );

  console.log("thresholdPct:                %s", thresholdPct);

  // console.log("ff:                          %s", ff);

  // const totalSupportPct = calculatePercentageDecimals(
  //   stakedAmount,
  //   totalEffectiveActivePoints,
  //   tokenDecimals,
  // );

  const totalSupportPct = calculatePercentageBigInt(
    stakedAmount,
    totalEffectiveActivePoints,
    tokenDecimals,
  );

  console.log("totalSupportPct:             %s", totalSupportPct);
  // const currentConvictionPct = calculatePercentageDecimals(
  //   updateConvictionLast,
  //   maxCVSupply,
  //   tokenDecimals,
  // );

  const currentConvictionPct = calculatePercentageBigInt(
    updateConvictionLast,
    maxCVSupply,
    tokenDecimals,
  );

  console.log("currentConviction:           %s", currentConvictionPct);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-10 p-1 sm:p-8">
      <header className="section-layout flex flex-col items-start gap-10 sm:flex-row">
        <div className="flex w-full items-center justify-center sm:w-auto">
          <Image
            src={proposalImg}
            alt={`proposal image ${proposalIdNumber}`}
            height={163}
            width={164}
          />
        </div>
        <div className="flex w-full flex-col gap-8">
          <div>
            <div className="mb-4 flex flex-col items-start gap-4 sm:mb-2 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
              <h2>
                Proposal #{proposalIdNumber} - {title}
              </h2>
              <Badge type={proposalType} />
            </div>
            <div className="flex items-center justify-between gap-4 sm:justify-start">
              <Badge status={status} />
              <p className="font-semibold">
                {prettyTimestamp(proposalData?.createdAt || 0)}
              </p>
            </div>
          </div>
          <p>{description}</p>
          <div className="flex flex-col gap-2">
            {!isSignalingType && (
              <>
                <Statistic
                  label={"requested amount"}
                  icon={<InformationCircleIcon />}
                >
                  <DisplayNumber
                    number={formatUnits(requestedAmount, 18)}
                    tokenSymbol={tokenSymbol}
                    compact={true}
                    className="font-bold text-black"
                  />
                </Statistic>
                <Statistic label={"beneficiary"} icon={<UserIcon />}>
                  <EthAddress address={beneficiary} actions="copy" />
                </Statistic>
              </>
            )}
            <Statistic label={"created by"} icon={<UserIcon />}>
              <EthAddress address={submitter} actions="copy" />
            </Statistic>
          </div>
        </div>
      </header>
      <section className="section-layout">
        <h2>Metrics</h2>
        {/* TODO: need designs for this entire section */}
        {status && proposalStatus[status] == "executed" ? (
          <div className="badge badge-success p-4 text-white">
            Proposal passed and executed successfully
          </div>
        ) : (
          <div className="mt-10 flex justify-evenly">
            <ConvictionBarChart
              currentConvictionPct={currentConvictionPct}
              thresholdPct={thresholdPct}
              proposalSupportPct={totalSupportPct}
              isSignalingType={isSignalingType}
            />
          </div>
        )}
      </section>
    </div>
  );
}
