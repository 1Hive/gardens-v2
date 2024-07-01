"use client";

import { Badge } from "@/components";
import { EthAddress } from "@/components";
import { cvStrategyABI } from "@/src/generated";
import { Abi, Address, createPublicClient, formatUnits, http } from "viem";
import { getChain } from "@/configs/chainServer";
import { ConvictionBarChart } from "@/components/Charts/ConvictionBarChart";
import {
  getProposalDataDocument,
  getProposalDataQuery,
} from "#/subgraph/.graphclient";
import { formatTokenAmount, calculatePercentageBigInt } from "@/utils/numbers";
import { getIpfsMetadata } from "@/utils/ipfsUtils";
import useSubgraphQueryByChain from "@/hooks/useSubgraphQueryByChain";
import { useState, useEffect, useMemo } from "react";
import { useContractRead, useContractWrite } from "wagmi";

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
  params: { proposalId: string; poolId: number; chain: number; garden: string };
}) {
  // TODO: fetch garden decimals in query
  const { data: getProposalResult } =
    useSubgraphQueryByChain<getProposalDataQuery>(
      chain,
      getProposalDataDocument,
      {
        garden: garden,
        proposalId: proposalId,
      },
      {},
      { topic: "proposal", id: proposalId, type: "update", chainId: chain },
    );

  const proposalData = getProposalResult?.cvproposal;

  const tokenSymbol = getProposalResult?.tokenGarden?.symbol;
  const tokenDecimals = getProposalResult?.tokenGarden?.decimals;
  const proposalIdNumber = proposalData?.proposalNumber;
  const convictionLast = proposalData?.convictionLast as string;
  const threshold = proposalData?.threshold as bigint;
  const proposalType = proposalData?.strategy.config?.proposalType as number;
  const requestedAmount = proposalData?.requestedAmount as bigint;
  const beneficiary = proposalData?.beneficiary as Address;
  const submitter = proposalData?.submitter as Address;
  const status = proposalData?.proposalStatus as number;
  const stakedAmount = proposalData?.stakedAmount as bigint;
  const metadata = proposalData?.metadata;

  const isSignalingType = proposalType == 0;

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

  const { data: thFromContract } = useContractRead({
    ...cvStrategyContract,
    functionName: "calculateThreshold",
    args: [proposalIdNumber],
  });

  const { data: totalEffectiveActivePoints } = useContractRead({
    ...cvStrategyContract,
    functionName: "totalEffectiveActivePoints",
  });

  const { data: stakeAmountFromContract } = useContractRead({
    ...cvStrategyContract,
    functionName: "getProposalStakedAmount",
    args: [proposalIdNumber],
  });

  const { data: getProposal } = useContractRead({
    ...cvStrategyContract,
    functionName: "getProposal",
    args: [proposalIdNumber],
  });

  const { data: updateConvictionLast } = useContractRead({
    ...cvStrategyContract,
    functionName: "updateProposalConviction" as any, // TODO: fix CVStrategy.updateProposalConviction to view in contract
    args: [proposalIdNumber],
  }) as { data: bigint | undefined };

  const { data: maxCVSupply } = useContractRead({
    ...cvStrategyContract,
    functionName: "getMaxConviction",
    args: [totalEffectiveActivePoints || 0n],
  });

  const percentages = useMemo(() => {
    if (
      !maxCVSupply ||
      !totalEffectiveActivePoints ||
      !updateConvictionLast ||
      !maxCVSupply
    ) {
      return;
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

    return {
      thresholdPct,
      totalSupportPct,
      currentConvictionPct,
    };
  }, [
    threshold,
    maxCVSupply,
    stakedAmount,
    totalEffectiveActivePoints,
    updateConvictionLast,
  ]);

  if (!getProposalResult) {
    return (
      <div className="w-full text-center">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!proposalData) {
    return (
      <p className="text-center text-2xl text-error">
        Proposal {proposalId} not found
      </p>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-7xl gap-3  px-4 sm:px-6 lg:px-8">
      <main className="bg-surface flex flex-1 flex-col gap-6 rounded-xl border-2 border-black bg-base-100 p-16">
        {/* main content */}
        <div className="flex justify-between">
          <div className="flex items-center gap-2">
            <Badge type={proposalType} />
            <h4 className="font-sm font-bold">
              <span className="">
                {" "}
                {prettyTimestamp(proposalData.createdAt || 0)}
              </span>
            </h4>
          </div>

          <h4 className="font-press">Pool: {poolId}</h4>
        </div>

        {/* title - description - status */}
        <div className="border2 relative space-y-12 rounded-xl bg-white px-8 py-4">
          <div className="flex justify-end">
            <Badge status={status} />
          </div>
          <div className=" flex items-baseline justify-end space-x-4 ">
            <h3 className="w-full text-center text-2xl font-semibold">
              {ipfsResult?.title}
            </h3>
          </div>
          <div className="">
            <p className="text-md text-justify">{ipfsResult?.description}</p>
          </div>
          <div>
            {/* reqAmount - bene - creatBy */}
            <div className="flex justify-between ">
              {!isSignalingType && !!requestedAmount && (
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
              {!isSignalingType && beneficiary && (
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

        {status && status == 4 ? (
          <div className="badge badge-success p-4 text-white">
            Proposal passed and executed successfully
          </div>
        ) : (
          <div className="mt-10 flex justify-evenly">
            {percentages && (
              <ConvictionBarChart
                currentConvictionPct={percentages.currentConvictionPct}
                thresholdPct={percentages.thresholdPct}
                proposalSupportPct={percentages.totalSupportPct}
                isSignalingType={isSignalingType}
              />
            )}
          </div>
        )}
      </main>
    </div>
  );
}
