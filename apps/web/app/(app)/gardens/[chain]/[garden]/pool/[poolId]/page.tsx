"use client";

import { Badge, Proposals, PoolMetrics } from "@/components";
import Image from "next/image";
import { gardenLand } from "@/assets";
import {
  Allo,
  CVStrategy,
  TokenGarden,
  getAlloQuery,
  getPoolDataDocument,
  getPoolDataQuery,
} from "#/subgraph/.graphclient";
import { Address } from "#/subgraph/src/scripts/last-addr";
import { getIpfsMetadata } from "@/utils/ipfsUtils";
import { pointSystems, poolTypes } from "@/types";
import { CV_SCALE_PRECISION } from "@/utils/numbers";
import { useEffect, useState } from "react";
import LoadingSpinner from "@/components/LoadingSpinner";
import useSubgraphQueryByChain from "@/hooks/useSubgraphQueryByChain";

export const dynamic = "force-dynamic";

export type AlloQuery = getAlloQuery["allos"][number];

export default function Pool({
  params: { chain, poolId, garden },
}: {
  params: { chain: string; poolId: number; garden: string };
}) {
  const { data, fetching, error } = useSubgraphQueryByChain<getPoolDataQuery>(
    chain,
    getPoolDataDocument,
    { poolId: poolId, garden: garden },
    {},
    {
      topic: "pool",
      id: poolId,
      chainId: chain,
    },
  );

  useEffect(() => {
    if (error) {
      console.error("Error while fetching pool data: ", error);
    }
  }, [error]);

  const [ipfsResult, setIpfsResult] =
    useState<Awaited<ReturnType<typeof getIpfsMetadata>>>();

  const metadata = data?.cvstrategies?.[0]?.metadata;

  useEffect(() => {
    if (metadata) {
      getIpfsMetadata(metadata).then((data) => {
        setIpfsResult(data);
      });
    }
  }, [metadata]);

  if (fetching || !ipfsResult) {
    return (
      <div className="mt-96">
        <LoadingSpinner />
      </div>
    );
  }

  const strategyObj = data?.cvstrategies?.[0];
  if (!data || !strategyObj) {
    return <div className="mt-52 text-center">Pool {poolId} not found</div>;
  }

  const pointSystem = data.cvstrategies?.[0].config?.pointSystem;
  const strategyAddr = strategyObj.id as Address;
  const communityAddress = strategyObj.registryCommunity.id as Address;
  const alloInfo = data.allos[0] as Allo;
  const proposalType = strategyObj?.config?.proposalType as number;
  const poolAmount = strategyObj?.poolAmount as number;
  const tokenGarden = data.tokenGarden as TokenGarden;

  const isEnabled = data.cvstrategies?.[0]?.isEnabled as boolean;

  const spendingLimitPct =
    (Number(strategyObj?.config?.maxRatio || 0) / CV_SCALE_PRECISION) * 100;

  console.log(
    "maxRatio: " + strategyObj?.config?.maxRatio,
    "minThresholdPoints: " + strategyObj?.config?.minThresholdPoints,
    "poolAmount: " + poolAmount,
  );

  return (
    <div className="relative mx-auto flex max-w-7xl gap-3 px-4 sm:px-6 lg:px-8">
      <div className="bg-surface flex flex-1 flex-col gap-6 rounded-xl border-2 border-black p-16">
        <header className="flex flex-col items-center justify-center">
          <h2 className="text-center font-press">Pool {poolId} </h2>
        </header>
        <main className="flex flex-col gap-10">
          {/* Description section */}
          <section className="relative flex w-full flex-col items-center overflow-hidden rounded-lg border-2 border-black bg-white">
            <div className="mt-4 flex w-full flex-col items-center gap-12 p-8">
              <h3 className="max-w-2xl  text-center font-semibold">
                {ipfsResult.title}
              </h3>
              {!isEnabled && (
                <div className="badge badge-warning absolute left-5 top-5 gap-2 p-4 font-bold">
                  Pending review from community council
                </div>
              )}

              <p>{ipfsResult.description}</p>
              <div className="flex w-full  p-4">
                <div className="flex flex-1  text-xl font-semibold">
                  <div className="mx-auto flex max-w-fit flex-col items-start justify-center space-y-4">
                    <div className="text-md stat-title">
                      Strategy:{" "}
                      <span className="text-md pl-2 text-black">
                        {" "}
                        Conviction Voting
                      </span>
                    </div>
                    {poolTypes[proposalType] !== "sigaling" && (
                      <div className="text-md stat-title">
                        Funding Token:{" "}
                        <span className="text-md pl-2 text-black">
                          {" "}
                          {tokenGarden?.symbol}
                        </span>
                      </div>
                    )}
                    <div className="text-md stat-title">
                      Points System:{" "}
                      <span className="text-md pl-2 text-black">
                        {pointSystems[pointSystem]}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-1 flex-col items-center space-y-2">
                  <p className="text-md stat-title text-xl font-semibold">
                    Proposals type accepted:
                  </p>
                  <div className="flex w-full items-center justify-evenly">
                    <Badge type={proposalType} />
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-center"></div>
            </div>
            <div className=" flex">
              {[...Array(6)].map((_, i) => (
                <Image
                  key={i}
                  src={gardenLand}
                  alt="garden land"
                  className=""
                />
              ))}
            </div>
          </section>
          {/* Pool metrics: for now we have funds available and spending limit */}
          {isEnabled && strategyObj && (
            <>
              {poolTypes[proposalType] !== "signaling" && (
                <PoolMetrics
                  alloInfo={alloInfo}
                  poolId={poolId}
                  balance={poolAmount}
                  strategyAddress={strategyAddr}
                  strategy={strategyObj}
                  communityAddress={communityAddress}
                  tokenGarden={tokenGarden}
                  pointSystem={pointSystem}
                  chainId={parseInt(chain)}
                  spendingLimitPct={spendingLimitPct}
                />
              )}
              {/* Proposals section */}
              <Proposals
                strategy={strategyObj}
                alloInfo={alloInfo}
                communityAddress={communityAddress}
                createProposalUrl={`/gardens/${chain}/${garden}/pool/${poolId}/create-proposal`}
                proposalType={proposalType}
              />
            </>
          )}
        </main>
      </div>
    </div>
  );
}
