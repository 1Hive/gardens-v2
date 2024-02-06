"use client";
import { flowers } from "@/assets";
import React, { FC } from "react";
import Image from "next/image";
import { StatusBadge } from "./Badge";
import { ActivePointsChart } from "@/components";
import { PoolTokenPriceChart } from "@/components";
import { ActivatePoints } from "./ActivatePoints";
import { useAccount, useContractRead } from "wagmi";
import { contractsAddresses } from "@/constants/contracts";
import { registryCommunityABI, cvStrategyABI, alloABI } from "@/src/generated";

type poolStatsProps = {
  balance?: string | number;
  strategyAddress: `0x${string}`;
  poolId: number;
};

export const PoolStats: FC<poolStatsProps> = ({
  balance,
  strategyAddress,
  poolId,
}) => {
  const { address: mainConnectedAccount } = useAccount();

  const {
    data: isMemberActived,
    error: errorMemberActivated,
    status,
  } = useContractRead({
    address: contractsAddresses.registryCommunity,
    abi: registryCommunityABI,
    functionName: "memberActivatedInStrategies",
    args: [mainConnectedAccount as `0x${string}`, strategyAddress],
    watch: true,
    cacheOnBlock: true,
  });

  const { data: voterStakePct } = useContractRead({
    address: strategyAddress,
    abi: cvStrategyABI,
    functionName: "getTotalVoterStakePct",
    args: [mainConnectedAccount as `0x${string}`],
    watch: true,
    cacheOnBlock: true,
  });

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
                  {isMemberActived ? "100" : "0"}
                </div>
              </div>
              <div className="flex flex-1 flex-col items-center">
                <p>Status</p>
                <StatusBadge
                  status={`${isMemberActived ? "active" : "inactive"}`}
                  classNames=""
                />
              </div>
            </div>

            {/* Activate - Deactivate/ points */}
            <div className="flex w-full justify-center">
              <ActivatePoints
                strategyAddress={strategyAddress}
                isMemberActived={isMemberActived}
                errorMemberActivated={errorMemberActivated}
              />
            </div>
          </div>
        </div>
      </div>

      {/* right  */}
      <div className="flex-1 space-y-8 rounded-xl border-2 border-black bg-white p-4">
        <div>
          <h4 className="text-center text-xl font-bold">Governance</h4>
        </div>
        <div>
          {/* Testing styles and Data */}
          <ActivePointsChart stakedPoints={Number(voterStakePct)} />
        </div>
      </div>
    </section>
  );
};
