"use client";
import { Badge, Statistic, DisplayNumber } from "@/components";
import { EthAddress } from "@/components";
import { cvStrategyABI } from "@/src/generated";
import { Address, formatUnits } from "viem";
import { ConvictionBarChart } from "@/components/Charts/ConvictionBarChart";
import {
  getProposalDataDocument,
  getProposalDataQuery,
} from "#/subgraph/.graphclient";
import { calculatePercentageBigInt } from "@/utils/numbers";
import Image from "next/image";
import { getIpfsMetadata } from "@/utils/ipfsUtils";
import { UserIcon, InformationCircleIcon } from "@heroicons/react/24/outline";
import { proposalStatus, poolTypes } from "@/types";
import { proposalImg } from "@/assets";
import useSubgraphQuery from "@/hooks/useSubgraphQuery";
import { useState, useEffect } from "react";
import { useContractRead } from "wagmi";
import LoadingSpinner from "@/components/LoadingSpinner";

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

const prettyTimestamp = (timestamp: number) => {
  const date = new Date(timestamp * 1000);

  const day = date.getDate();
  const month = date.toLocaleString("default", { month: "short" });
  const year = date.getFullYear();

  return `${day} ${month} ${year}`;
};

export default function Proposal({
  params: { proposalId, poolId, chain, garden },
}: {
  params: { proposalId: string; poolId: string; chain: string; garden: string };
}) {
  // TODO: fetch garden decimals in query
  const { data } = useSubgraphQuery<getProposalDataQuery>({
    query: getProposalDataDocument,
    variables: {
      garden: garden,
      proposalId: proposalId,
    },
    changeScope: {
      topic: "proposal",
      id: proposalId,
      type: "update",
    },
  });

  const proposalData = data?.cvproposal;

  const metadata = proposalData?.metadata;

  const [ipfsResult, setIpfsResult] =
    useState<Awaited<ReturnType<typeof getIpfsMetadata>>>();

  useEffect(() => {
    if (metadata) {
      getIpfsMetadata(metadata).then((data) => {
        setIpfsResult(data);
      });
    }
  }, [metadata]);

  const cvStrategyContract = {
    address: proposalData?.strategy.id as Address,
    abi: cvStrategyABI,
  };

  const proposalIdNumber = proposalData?.proposalNumber;

  const { data: thFromContract } = useContractRead({
    ...cvStrategyContract,
    functionName: "calculateThreshold",
    args: [proposalIdNumber],
    enabled: !!proposalIdNumber,
  });

  const { data: totalEffectiveActivePoints } = useContractRead({
    ...cvStrategyContract,
    functionName: "totalEffectiveActivePoints",
  });

  const { data: stakeAmountFromContract } = useContractRead({
    ...cvStrategyContract,
    functionName: "getProposalStakedAmount",
    args: [proposalIdNumber],
    enabled: !!proposalIdNumber,
  });

  const { data: updateConvictionLast } = useContractRead({
    ...cvStrategyContract,
    functionName: "updateProposalConviction" as any, // TODO: fix CVStrategy.updateProposalConviction to view in contract
    args: [proposalIdNumber],
    enabled: !!proposalIdNumber,
  }) as { data: bigint | undefined };

  const { data: maxCVSupply } = useContractRead({
    ...cvStrategyContract,
    functionName: "getMaxConviction",
    args: [totalEffectiveActivePoints || 0n],
    enabled: !!totalEffectiveActivePoints,
  });

  if (
    !proposalData ||
    !ipfsResult ||
    !maxCVSupply ||
    !totalEffectiveActivePoints ||
    updateConvictionLast == null
  ) {
    return (
      <div className="mt-96">
        <LoadingSpinner />
      </div>
    );
  }

  const tokenSymbol = data.tokenGarden?.symbol;
  const tokenDecimals = data.tokenGarden?.decimals;
  const convictionLast = proposalData.convictionLast;
  const threshold = proposalData.threshold;
  const proposalType = proposalData.strategy.config?.proposalType;
  const requestedAmount = proposalData.requestedAmount;
  const beneficiary = proposalData.beneficiary as Address;
  const submitter = proposalData.submitter as Address;
  const status = proposalData.proposalStatus;
  const stakedAmount = proposalData.stakedAmount;

  const isSignalingType = poolTypes[proposalType] === "signaling";

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

  let thresholdPct = calculatePercentageBigInt(
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

  let totalSupportPct = calculatePercentageBigInt(
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

  let currentConvictionPct = calculatePercentageBigInt(
    BigInt(updateConvictionLast),
    maxCVSupply,
    tokenDecimals,
  );

  console.log("currentConviction:           %s", currentConvictionPct);

  return (
    <div className="page-layout">
      <header className="section-layout flex flex-col items-start gap-10 sm:flex-row">
        <div className="flex w-full items-center justify-center sm:w-auto">
          <Image
            src={proposalImg}
            alt={`proposal image ${proposalIdNumber}`}
            height={160}
            width={160}
            className="min-h-[160px] min-w-[160px]"
          />
        </div>
        <div className="flex w-full flex-col gap-8">
          <div>
            <div className="mb-4 flex flex-col items-start gap-4 sm:mb-2 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
              <h2>
                {ipfsResult?.title} #{proposalIdNumber}
              </h2>
              <Badge type={proposalType} />
            </div>
            <div className="flex items-center justify-between gap-4 sm:justify-start">
              <Badge status={status} />
              <p className="font-semibold">
                {prettyTimestamp(proposalData?.createdAt ?? 0)}
              </p>
            </div>
          </div>
          <p>{ipfsResult?.description}</p>
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
