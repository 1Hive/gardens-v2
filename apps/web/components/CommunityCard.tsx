"use client";

import { useCallback, useEffect, useState } from "react";
import { RegisterMember } from "@/components";
import {
  UserGroupIcon,
  BuildingOffice2Icon,
} from "@heroicons/react/24/outline";
import {
  PoolCard,
  IncreasePower,
  CommunityProfile,
  FormLink,
} from "@/components";
import { usePathname } from "next/navigation";
import { Address, useAccount } from "wagmi";
import {
  TokenGarden,
  getCommunitiesByGardenQuery,
  isMemberDocument,
  isMemberQuery,
} from "#/subgraph/.graphclient";
import { formatTokenAmount } from "@/utils/numbers";
import { useUrqlClient } from "@/hooks/useUqrlClient";
import { getChainIdFromPath } from "@/utils/path";
import useSubgraphQueryByChain from "@/hooks/useSubgraphQueryByChain";

export type StakesMemberType =
  isMemberQuery["members"][number]["memberCommunity"];

type CommunityQuery = NonNullable<
  NonNullable<getCommunitiesByGardenQuery["tokenGarden"]>["communities"]
>[number];

type CommunityCardProps = CommunityQuery & {
  tokenGarden: TokenGarden | undefined;
} & {
  covenantData?: { logo: string; covenant: string };
};

export function CommunityCard({
  covenantData,
  communityName: name,
  id: communityAddress,
  strategies,
  members,
  registerStakeAmount,
  protocolFee,
  communityFee,
  tokenGarden,
}: CommunityCardProps) {
  const { address: accountAddress } = useAccount();
  const [memberStakedTokens, setMemberStakedTokens] = useState<string>("0");
  const pathname = usePathname();

  const urqlClient = useUrqlClient();

  const chainId = getChainIdFromPath();

  const { data: result, error } = useSubgraphQueryByChain<isMemberQuery>(
    chainId,
    isMemberDocument,
    {
      me: accountAddress?.toLowerCase(),
      comm: communityAddress.toLowerCase(),
    },
  );

  useEffect(() => {

    if (result && result.members.length > 0) {
      const stakedTokens =
        result.members?.[0]?.memberCommunity?.[0]?.stakedTokens;
      const memberStakedTokens =
        typeof stakedTokens === "string" ? stakedTokens : "0";

      setMemberStakedTokens(memberStakedTokens);
    }
  }, [result]);

  const pools = strategies ?? [];

  members = members ?? [];
  let registerToken = tokenGarden?.id ?? "0x0";
  registerStakeAmount =
    registerStakeAmount !== undefined ? BigInt(registerStakeAmount) : 0n;

  const signalingPools = pools.filter(
    (pool) => pool.config?.proposalType === "0" && pool.isEnabled,
  );

  const fundingPools = pools.filter(
    (pool) => pool.config?.proposalType === "1" && pool.isEnabled,
  );

  const poolsInReview = pools.filter((pool) => !pool.isEnabled);

  return (
    <>
      <div className="border2 rounded-lg bg-white p-4">
        <div className="flex w-full flex-col items-center justify-center gap-10 rounded-xl bg-base-100 py-4">
          <h2 className="text-center font-press text-3xl text-info-content">
            {name}
          </h2>
          <CommunityProfile
            communityAddress={communityAddress as Address}
            name={name as string}
            covenantData={covenantData}
          />
        </div>

        {/* main: stats, action buttons, display pools */}
        <main className="card-body space-y-10">
          <div className="stats flex">
            <div className="stat flex-1">
              <div className="stat-figure text-primary">
                <UserGroupIcon className="inline-block h-8 w-8 text-primary" />
              </div>
              <div className="stat-title">Members</div>
              <div className="stat-value text-primary">{members.length}</div>
              <div className="stat-desc">
                {formatTokenAmount(registerStakeAmount, tokenGarden?.decimals)}{" "}
                {tokenGarden?.symbol} membership
              </div>
            </div>

            <div className="stat flex-1">
              <div className="stat-figure text-secondary">
                <BuildingOffice2Icon className="inline-block h-8 w-8 text-secondary" />
              </div>
              <div className="stat-title">Pools</div>

              <div className="stat-value text-secondary">{pools.length}</div>
              {/* TODO: add this parameter */}
              <div className="stat-desc"> # in total funds</div>
            </div>
          </div>

          <div>
            <RegisterMember
              name={name as string}
              connectedAccount={accountAddress as Address}
              tokenSymbol={tokenGarden?.symbol as string}
              communityAddress={communityAddress as Address}
              registerToken={registerToken as Address}
              registerTokenDecimals={tokenGarden?.decimals as number}
              membershipAmount={registerStakeAmount as bigint}
              protocolFee={protocolFee}
              communityFee={communityFee}
            />

            <div className="flex-1"> {/* TODO: add pool btn here ???*/}</div>
          </div>
          <div className="flex flex-col justify-end gap-2">
            <div className="flex items-center justify-between">
              <h3>Pools</h3>
              <FormLink
                href={`${pathname}/${communityAddress}/create-pool`}
                label="Create Pool"
              />
            </div>

            <h5 className="font-bold">
              Signaling pools ( {signalingPools.length} ){" "}
            </h5>
            <div
              className={`flex w-full transform flex-wrap gap-4 overflow-x-auto transition-height duration-200 ease-in-out  `}
            >
              {signalingPools.map((pool, i) => (
                <PoolCard tokenGarden={tokenGarden} {...pool} key={i} />
              ))}

              {/* {pools.length > 2 && (
                <Button
                  className="!rounded-full bg-white !p-3"
                  onClick={() => setOpen((prev) => !prev)}
                >
                  <ChevronDownIcon
                    className={`block h-6 w-6 stroke-2 ${open && "rotate-180"}`}
                    aria-hidden="true"
                  />
                </Button>
              )} */}
            </div>
            <h5 className="mt-4 font-bold">
              Funding pools ( {fundingPools.length} )
            </h5>
            <div
              className={`flex w-full transform flex-wrap gap-4 overflow-x-auto transition-height duration-200 ease-in-out  `}
            >
              {fundingPools.map((pool, i) => (
                <PoolCard tokenGarden={tokenGarden} {...pool} key={i} />
              ))}
            </div>

            <h5 className="mt-4 font-bold">
              Pools in Review ( {poolsInReview.length} )
            </h5>
            <div
              className={`mt-2 flex w-full transform flex-wrap gap-4 overflow-x-auto transition-height duration-200 ease-in-out  `}
            >
              {poolsInReview.map((pool, i) => (
                <PoolCard
                  tokenGarden={tokenGarden}
                  {...pool}
                  key={i}
                  enabled={false}
                />
              ))}
            </div>

            { }

            {/* IncreasePower funcionality - alpha test */}
            <h3 className="mt-10">Your stake in the community</h3>
            <IncreasePower
              communityAddress={communityAddress as Address}
              registerToken={registerToken as Address}
              connectedAccount={accountAddress as Address}
              tokenSymbol={tokenGarden?.symbol as string}
              registerTokenDecimals={tokenGarden?.decimals as number}
              registerStakeAmount={registerStakeAmount as bigint}
              memberStakedTokens={BigInt(memberStakedTokens)}
            />
          </div>
        </main>
      </div>
    </>
  );
}
