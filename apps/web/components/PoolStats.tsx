"use client";
import { flowers } from "@/assets";
import React, { FC } from "react";
import Image from "next/image";
import { StatusBadge } from "./Badge";
import { ActivatePoints } from "./ActivatePoints";
import { Strategy } from "./Proposals";
import { useTotalVoterStakedPct } from "@/hooks/useTotalVoterStakedPct";
import { useIsMemberActivated } from "@/hooks/useIsMemberActivated";
import { Address, useAccount, useBalance } from "wagmi";
import { PRECISION_SCALE } from "@/actions/getProposals";
import { formatTokenAmount } from "@/utils/numbers";

type PoolStatsProps = {
  balance: string | number;
  strategyAddress: Address;
  strategy: Strategy;
  communityAddress: Address;
  tokenGarden: any;
  pointSystem: string;
};

const pointSystemObject = {
  0: "Fixed",
  1: "Capped",
  2: "Unlimited",
  3: "Quadratic",
};

export const PoolStats: FC<PoolStatsProps> = ({
  balance,
  strategyAddress,
  strategy,
  communityAddress,
  tokenGarden,
  pointSystem,
}) => {
  const { isMemberActived } = useIsMemberActivated(strategy);
  const { isConnected } = useAccount();
  const { voterStakePct } = useTotalVoterStakedPct(strategy);

  return (
    <section className="flex max-h-96 w-full gap-8 rounded-xl bg-none">
      <div className="flex flex-1 flex-col gap-8">
        {/*  */}
        {/* left-top */}
        <div className="flex-flex-col flex max-h-44 w-full items-center justify-center space-y-4 rounded-xl border-2 border-black bg-white p-4">
          <div>
            <div className="flex h-full flex-col items-start">
              <div className="flex w-full items-baseline gap-8">
                <h4 className="stat-title text-center text-xl font-bold">
                  Funds Available:
                </h4>
                <h4 className="stat-value text-center text-2xl font-bold ">
                  {balance
                    ? formatTokenAmount(balance, tokenGarden?.decimals)
                    : "0"}
                </h4>
              </div>
            </div>
          </div>
          <div className="max-h-30 flex items-center gap-3 ">
            <div className="border-1 flex h-24 flex-1 items-center justify-center">
              {/* <PoolTokenPriceChart /> */}
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
          <div className="text-md stat-title font-bold">
            Points System:{" "}
            <span className="text-md pl-2 text-black">
              {
                pointSystemObject[
                  pointSystem as unknown as keyof typeof pointSystemObject
                ]
              }
            </span>
          </div>
        </div>
        {voterStakePct && Number(voterStakePct) !== 0 ? (
          <div className="flex h-48 flex-col items-center justify-center">
            <p className="rounded-xl bg-surface px-8 py-3 text-lg font-semibold">
              You have distributed:
            </p>
            <p className="text-5xl font-semibold">
              {Number(voterStakePct / PRECISION_SCALE)} %{" "}
              <span className="text-sm">of your points</span>
            </p>
          </div>
        ) : (
          // <ActivePointsChart stakedPoints={Number(voterStakePct)} />
          <div className="flex h-48 items-center justify-center">
            <p className="rounded-xl bg-warning p-2 text-lg font-semibold">
              No points distributed yet
            </p>
          </div>
        )}
      </div>
    </section>
  );
};
