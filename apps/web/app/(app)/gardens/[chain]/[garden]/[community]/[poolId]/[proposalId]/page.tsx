"use client";
import { useEffect, useState } from "react";
import { InformationCircleIcon, UserIcon } from "@heroicons/react/24/outline";
import Image from "next/image";
import { Address, formatUnits } from "viem";
import { useContractRead } from "wagmi";
import {
  getProposalDataDocument,
  getProposalDataQuery,
} from "#/subgraph/.graphclient";
import { proposalImg } from "@/assets";
import { Badge, DisplayNumber, EthAddress, Statistic } from "@/components";
import { ConvictionBarChart } from "@/components/Charts/ConvictionBarChart";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useSubgraphQuery } from "@/hooks/useSubgraphQuery";
import { cvStrategyABI } from "@/src/generated";
import { poolTypes, proposalStatus } from "@/types";
import { getIpfsMetadata } from "@/utils/ipfsUtils";
import { calculatePercentageBigInt } from "@/utils/numbers";

const prettyTimestamp = (timestamp: number) => {
  const date = new Date(timestamp * 1000);

  const day = date.getDate();
  const month = date.toLocaleString("default", { month: "short" });
  const year = date.getFullYear();

  return `${day} ${month} ${year}`;
};

export default function Page({
  params: { proposalId, garden },
}: {
  params: {
    proposalId: string;
    poolId: string;
    chain: string;
    garden: string;
  };
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
      getIpfsMetadata(metadata).then((d) => {
        setIpfsResult(d);
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

  const isProposalEnded =
    !!proposalData &&
    (proposalStatus[proposalData.proposalStatus] !== "executed" ||
      proposalStatus[proposalData.proposalStatus] !== "cancelled");

  const { data: updateConvictionLast } = useContractRead({
    ...cvStrategyContract,
    functionName: "updateProposalConviction" as any, // TODO: fix CVStrategy.updateProposalConviction to view in contract
    args: [proposalIdNumber],
    enabled: !!proposalIdNumber,
  }) as { data: bigint | undefined };

  const { data: maxCVSupply } = useContractRead({
    ...cvStrategyContract,
    functionName: "getMaxConviction",
    args: [totalEffectiveActivePoints ?? 0n],
    enabled: !!totalEffectiveActivePoints,
  });

  const tokenSymbol = data?.tokenGarden?.symbol;
  const tokenDecimals = data?.tokenGarden?.decimals;
  const convictionLast = proposalData?.convictionLast;
  const threshold = proposalData?.threshold;
  const proposalType = proposalData?.strategy.config?.proposalType;
  const requestedAmount = proposalData?.requestedAmount;
  const beneficiary = proposalData?.beneficiary as Address | undefined;
  const submitter = proposalData?.submitter as Address | undefined;
  const status = proposalData?.proposalStatus;
  const stakedAmount = proposalData?.stakedAmount;

  useEffect(() => {
    if (!proposalData) {
      return;
    }

    console.debug({
      requestedAmount,
      maxCVSupply,
      threshold,
      thFromContract,
      stakedAmount,
      stakeAmountFromContract: stakeAmountFromContract,
      totalEffectiveActivePoints,
      updateConvictionLast,
      convictionLast,
    });
  }, [proposalData]);

  if (
    !proposalData ||
    !ipfsResult ||
    !maxCVSupply ||
    !totalEffectiveActivePoints ||
    (updateConvictionLast == null && !isProposalEnded)
  ) {
    return (
      <div className="mt-96">
        <LoadingSpinner />
      </div>
    );
  }

  const isSignalingType = poolTypes[proposalType] === "signaling";

  let thresholdPct = calculatePercentageBigInt(
    threshold,
    maxCVSupply,
    tokenDecimals,
  );

  let totalSupportPct = calculatePercentageBigInt(
    stakedAmount,
    totalEffectiveActivePoints,
    tokenDecimals,
  );

  let currentConvictionPct = calculatePercentageBigInt(
    BigInt(updateConvictionLast ?? 0),
    maxCVSupply,
    tokenDecimals,
  );

  console.debug({
    thresholdPct,
    totalSupportPct,
    currentConvictionPct,
  });

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
        {status && proposalStatus[status] === "executed" ?
          <div className="my-8 flex w-full justify-center">
            <div className="badge badge-success p-4 text-primary">
              Proposal passed and executed successfully
            </div>
          </div>
          : ( <ConvictionBarChart
            currentConvictionPct={currentConvictionPct}
            thresholdPct={thresholdPct}
            proposalSupportPct={totalSupportPct}
            isSignalingType={isSignalingType}
            proposalId={proposalIdNumber}
          />
          )}
      </section>
    </div>
  );
}
