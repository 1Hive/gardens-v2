"use client";
import { flowers } from "@/assets";
import React, { FC } from "react";
import Image from "next/image";
import { StatusBadge } from "./Badge";
import { ActivePointsChart } from "@/components";
import { PoolTokenPriceChart } from "@/components";
import { ActivateMember } from "./ActivateMember";
import { useAccount, useContractRead } from "wagmi";
import { contractsAddresses } from "@/constants/contracts";
import { registryCommunityAbi } from "@/src/generated";

type poolStatsProps = {
  balance?: string | number;
  strategyAddress: `0x${string}`;
};

export const PoolStats: FC<poolStatsProps> = ({ balance, strategyAddress }) => {
  const { address: mainConnectedAccount } = useAccount();

  const {
    data: isMemberActived,
    error: errorMemberActivated,
    status,
  } = useContractRead({
    address: contractsAddresses.registryCommunity,
    abi: registryCommunityAbi,
    functionName: "memberActivatedInStrategies",
    args: [mainConnectedAccount as `0x${string}`, strategyAddress],
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
            <h4 className="text-center text-xl font-bold">Funding Pool</h4>
          </div>
          <div className="max-h-30 flex items-center gap-3 ">
            <div className="border-1 flex h-24 flex-1 items-center justify-center">
              <PoolTokenPriceChart />
            </div>
            <div className="flex-[0.4] rounded-xl border-2 border-black bg-primary py-3 text-center text-xl font-semibold text-white">
              {balance} HNY
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
                <div className="badge badge-success w-20 min-w-16 p-4 text-white">
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
              <ActivateMember
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
          <ActivePointsChart />
        </div>
      </div>
    </section>
  );
};
