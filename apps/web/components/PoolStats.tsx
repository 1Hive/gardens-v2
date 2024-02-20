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
import { useAccount } from "wagmi";

type PoolStatsProps = {
  balance?: string | number;
  strategyAddress: `0x${string}`;
  strategy: Strategy;
  // poolId: number;
  // communityAddress: `0x${string}`;
};

export const PoolStats: FC<PoolStatsProps> = ({
  balance,
  strategyAddress,
  strategy,
}) => {
  const { isMemberActived } = useIsMemberActivated(strategy);
  const { isConnected } = useAccount();

  const { voterStakePct } = useTotalVoterStakedPct(strategy);

  return (
    <section className="flex h-fit w-full gap-8 rounded-xl bg-none">
      <div className="flex flex-1 flex-col gap-8">
        {/*  */}
        {/* left-top */}
        <div className="flex-flex-col max-h-44 w-full space-y-4 rounded-xl border-2 border-black bg-white p-4">
          <div>
            <div className="flex items-center justify-around">
              <h4 className="text-center text-xl font-bold">Funding Pool</h4>
              <h4 className="text-center text-2xl font-bold">{balance} HNY</h4>
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
                <StatusBadge
                  status={isConnected && isMemberActived ? 1 : 2}
                  classNames=""
                />
              </div>
            </div>

            {/* Activate - Deactivate/ points */}
            <div className="flex w-full justify-center">
              <ActivatePoints
                strategyAddress={strategyAddress}
                isMemberActived={isMemberActived}
                // errorMemberActivated={errorMemberActivated}
              />
            </div>
          </div>
        </div>
      </div>

      {/* right  */}
      <div className="flex-1 space-y-8 rounded-xl border-2 border-black bg-white p-4">
        <div>
          <h4 className="text-center text-xl font-bold">Active Points</h4>
        </div>
        <div>
          {/* Testing styles and Data */}
          <ActivePointsChart stakedPoints={Number(voterStakePct)} />
          {/* <ActivePointsChart stakedPoints={Number(0)} /> */}
        </div>
      </div>
    </section>
  );
};
