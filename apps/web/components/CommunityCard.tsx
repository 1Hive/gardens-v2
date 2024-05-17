"use client";
import { useCallback, useEffect, useState } from "react";
import { Button, RegisterMember } from "@/components";
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
import { useDisableButtons } from "@/hooks/useDisableButtons";
import { usePathname } from "next/navigation";
import { Address, useAccount } from "wagmi";
import {
  TokenGarden,
  getCommunitiesByGardenQuery,
  isMemberDocument,
  isMemberQuery,
} from "#/subgraph/.graphclient";
import { formatTokenAmount } from "@/utils/numbers";
import Link from "next/link";
import { queryByChain } from "@/providers/urql";
import { useUrqlClient } from "@/hooks/useUqrlClient";
import { getChainIdFromPath } from "@/utils/path";

export type StakesMemberType = isMemberQuery["members"][number]["stakes"];

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
  const [memberStakedTokens, setMemberStakedTokens] = useState<
    StakesMemberType | undefined
  >();
  const pathname = usePathname();

  const urqlClient = useUrqlClient();

  const chainId = getChainIdFromPath();

  const runIsMemberQuery = useCallback(async () => {
    if (accountAddress === undefined) {
      return;
    }
    const { data: result, error } = await queryByChain<isMemberQuery>(
      urqlClient,
      chainId,
      isMemberDocument,
      {
        me: accountAddress.toLowerCase(),
        comm: communityAddress.toLowerCase(),
      },
    );

    if (result && result.members.length > 0) {
      const memberStakedTokens = (result.members?.[0].memberCommunity?.[0]
        .stakedTokens ?? 0) as StakesMemberType;

      setMemberStakedTokens(memberStakedTokens);
    }
  }, [accountAddress]);

  const calculateRemainingStake = () => {
    const remainingStake = formatTokenAmount(
      Number(memberStakedTokens ?? 0) - Number(registerStakeAmount),
      tokenGarden?.decimals,
    );

    return Number(remainingStake);
  };

  //diff between registerAmount and totalStakeAmount
  const addedStake = calculateRemainingStake();

  useEffect(() => {
    runIsMemberQuery();
  }, [accountAddress]);

  const pools = strategies ?? [];

  members = members ?? [];
  let registerToken = tokenGarden?.id ?? "0x0";
  registerStakeAmount = registerStakeAmount ?? 0;

  const signalingPools = pools.filter(
    (pool) => pool.config?.proposalType === "0" && pool.isEnabled === true,
  );

  const fundingPools = pools.filter(
    (pool) => pool.config?.proposalType === "1" && pool.isEnabled === true,
  );

  const poolInReview = pools.filter((pool) => pool.isEnabled === false);

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
              membershipAmount={registerStakeAmount}
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
              Pools in Review ( {fundingPools.length} )
            </h5>
            <div
              className={`mt-2 flex w-full transform flex-wrap gap-4 overflow-x-auto transition-height duration-200 ease-in-out  `}
            >
              {poolInReview.map((pool, i) => (
                <PoolCard
                  tokenGarden={tokenGarden}
                  {...pool}
                  key={i}
                  enabled={false}
                />
              ))}
            </div>

            {}

            {/* IncreasePower funcionality - alpha test */}
            <h3 className="mt-10">Your stake in the community</h3>
            <IncreasePower
              communityAddress={communityAddress as Address}
              registerToken={registerToken as Address}
              connectedAccount={accountAddress as Address}
              tokenSymbol={tokenGarden?.symbol as string}
              registerTokenDecimals={tokenGarden?.decimals as number}
              addedStake={addedStake}
            />
          </div>
        </main>
      </div>
    </>
  );
}
