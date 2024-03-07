"use client";
import { flowers } from "@/assets";
import React, { FC } from "react";
import Image from "next/image";
import { StatusBadge } from "./Badge";
import { ActivePointsChart } from "@/components";
import { PoolTokenPriceChart } from "@/components";
import { ActivatePoints } from "./ActivatePoints";
import { Strategy } from "./Proposals";
import { useTotalVoterStakedPct } from "@/hooks/useTotalVoterStakedPct";
import { useIsMemberActivated } from "@/hooks/useIsMemberActivated";
import { Address, useAccount } from "wagmi";
import { PRECISION_SCALE } from "@/actions/getProposals";

type PoolStatsProps = {
  balance?: string | number;
  strategyAddress: Address;
  strategy: Strategy;
  // poolId: number;
  communityAddress: Address;
};

export const PoolStats: FC<PoolStatsProps> = ({
  balance,
  strategyAddress,
  strategy,
  communityAddress,
}) => {
  const { isMemberActived } = useIsMemberActivated(strategy);
  const { isConnected } = useAccount();

  const { voterStakePct } = useTotalVoterStakedPct(strategy);

  console.log("voteStakePct", voterStakePct);
  console.log("startegy - pool", strategy);

  return (
    <section className="flex max-h-96 w-full gap-8 rounded-xl bg-none">
      <div className="flex flex-1 flex-col gap-8">
        {/*  */}
        {/* left-top */}
        <div className="flex-flex-col max-h-44 w-full space-y-4 rounded-xl border-2 border-black bg-white p-4">
          <div>
            <div className="flex items-center justify-around">
              <h4 className="text-center text-xl font-bold">
                Funds Available:
              </h4>
              <h4 className="text-center text-2xl font-bold">{balance}</h4>
            </div>
          </div>
          <div className="max-h-30 flex items-center gap-3 ">
            <div className="border-1 flex h-24 flex-1 items-center justify-center">
              <PoolTokenPriceChart />
            </div>
          </div>
        </div>

        {/* left-bottom */}
        <div className="flex min-h-44 w-full items-center justify-between gap-8 rounded-xl border-2 border-black bg-white p-4">
          <div className="">
            <Image src={flowers} alt="garden land" className="" />
          </div>
          <div className="flex h-full flex-1 flex-col justify-between font-semibold">
            <div className="flex justify-between">
              {/* Points & Status */}
              <div className="flex flex-1 flex-col items-center">
                <p>Points</p>
                <div className="badge w-20 min-w-16 bg-inherit p-4 text-xl text-black">
                  {isConnected ? (isMemberActived ? "100" : "0") : ":("}
                </div>
              </div>
              <div className="flex flex-1 flex-col items-center">
                <p>Status</p>
                <StatusBadge status={isMemberActived ? 1 : 0} classNames="" />
              </div>
            </div>

            {/* Activate - Deactivate/ points */}
            <div className="flex w-full justify-center">
              <ActivatePoints
                strategyAddress={strategyAddress}
                isMemberActived={isMemberActived}
                communityAddress={communityAddress}
                // errorMemberActivated={errorMemberActivated}
              />
            </div>
          </div>
        </div>
      </div>

      {/* right  */}
      <div className="flex-1 space-y-8 rounded-xl border-2 border-black bg-white p-4">
        <div className="flex flex-col items-center gap-2">
          <h4 className="text-center text-xl font-bold">
            Active Points Distribution
          </h4>
          <p className="text-md stat">Points System: Fixed</p>
        </div>
        {voterStakePct && Number(voterStakePct) !== 0 ? (
          <div className="flex h-48 flex-col items-center justify-center">
            <p>voterStakePct</p>
            <p className="text-5xl font-semibold">{Number(voterStakePct / PRECISION_SCALE)} %</p>
          </div>
        ) : (
          // <ActivePointsChart stakedPoints={Number(voterStakePct)} />
          <div className="flex h-48 items-center justify-center">
            <p className="text-lg font-semibold">No Points Activated</p>
          </div>
        )}
      </div>
    </section>
  );
};
