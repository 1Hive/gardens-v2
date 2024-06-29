import { commImg, groupFlowers } from "@/assets";
import React from "react";
import Image from "next/image";
import {
  EthAddress,
  Statistic,
  PoolCard,
  RegisterMember,
  DisplayNumber,
  IncreasePower,
  FormLink,
} from "@/components";
import { initUrqlClient, queryByChain } from "@/providers/urql";
import { Address } from "viem";
import {
  RegistryCommunity,
  TokenGarden,
  getCommunityDocument,
  getCommunityQuery,
} from "#/subgraph/.graphclient";
import {
  CurrencyDollarIcon,
  RectangleGroupIcon,
} from "@heroicons/react/24/outline";

const { urqlClient } = initUrqlClient();

export default async function CommunityPage({
  params: { chain, garden: tokenAddr, community: communityAddr },
}: {
  params: { chain: number; garden: string; community: string };
}) {
  const { data: result, error: error } = await queryByChain<getCommunityQuery>(
    urqlClient,
    chain,
    getCommunityDocument,
    { communityAddr: communityAddr, tokenAddr: tokenAddr },
  );

  let tokenGarden = result?.tokenGarden;

  let {
    communityName,
    members,
    strategies,
    communityFee,
    registerStakeAmount,
    registerToken,
    protocolFee,
    covenantIpfsHash,
  } = result?.registryCommunity as RegistryCommunity;

  const communityStakedTokens =
    members?.reduce(
      (acc: bigint, member) => acc + BigInt(member?.stakedTokens),
      0n,
    ) ?? 0;

  strategies = strategies ?? [];

  const signalingPools = strategies.filter(
    (strategy) => strategy.config?.proposalType === "0" && strategy.isEnabled,
  );

  const fundingPools = strategies.filter(
    (strategy) => strategy.config?.proposalType === "1" && strategy.isEnabled,
  );

  const poolsInReview = strategies.filter((strategy) => !strategy.isEnabled);

  let covenant = "";

  if (covenantIpfsHash) {
    try {
      const response = await fetch("https://ipfs.io/ipfs/" + covenantIpfsHash);
      const json = await response.json();
      covenant = typeof json.covenant === "string" && json.covenant;
    } catch (error) {
      console.log(error);
    }
  }

  const activePools = strategies?.filter((strategy) => strategy?.isEnabled);

  return (
    <div className="page-layout">
      <header className="section-layout flex flex-row items-center gap-10">
        <div>
          <Image
            src={commImg}
            alt={`${communityName} community`}
            className="h-[180px]"
            height={180}
            width={180}
          />
        </div>
        <div className="flex flex-1 flex-col gap-2">
          <div>
            <h2>{communityName}</h2>
            <EthAddress address={communityAddr as Address} />
          </div>
          <div className="flex flex-col gap-2">
            <Statistic label="members" count={members?.length ?? 0} />
            <Statistic
              label="pools"
              icon={<RectangleGroupIcon />}
              count={activePools.length ?? 0}
            />
            <Statistic label="staked tokens" icon={<CurrencyDollarIcon />}>
              <DisplayNumber
                number={[BigInt(communityStakedTokens), tokenGarden?.decimals]}
                compact={true}
                tokenSymbol={tokenGarden?.symbol}
              />
            </Statistic>
          </div>
        </div>
        <div className="flex flex-col gap-4">
          {/* <div className="flex flex-col gap-2">
            <Statistic
              label="registration amount"
              count={registerStakeAmount}
            />
            <Statistic label="community fee" count={communityFee} />
          </div> */}
          <RegisterMember
            tokenSymbol={tokenGarden?.symbol ?? ""}
            communityAddress={communityAddr as Address}
            registerToken={tokenAddr as Address}
            registerTokenDecimals={tokenGarden?.decimals}
            membershipAmount={registerStakeAmount}
            protocolFee={protocolFee}
            communityFee={communityFee}
          />
        </div>
      </header>
      <IncreasePower
        communityAddress={communityAddr as Address}
        registerToken={registerToken as Address}
        tokenSymbol={tokenGarden?.symbol ?? ""}
        registerTokenDecimals={tokenGarden?.decimals as number}
        registerStakeAmount={BigInt(registerStakeAmount)}
      />
      <section className="section-layout flex flex-col gap-10">
        <header className="flex justify-between">
          <h2>Pools</h2>
          <FormLink href={`/gardens/${chain}/${tokenAddr}/${communityAddr}/create-pool`} label="Create Pool" />
        </header>
        <div className="flex flex-col gap-4">
          <h4 className="text-secondary-content">
            Funding pools ( {fundingPools.length} )
          </h4>
          <div className="flex flex-row flex-wrap gap-10">
            {fundingPools.map((pool) => (
              <PoolCard
                key={pool.poolId}
                tokenGarden={tokenGarden as TokenGarden}
                {...pool}
              />
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <h4 className="text-secondary-content">
            Signaling pools ( {signalingPools.length} )
          </h4>
          <div className="flex flex-row flex-wrap gap-10">
            {signalingPools.map((pool) => (
              <PoolCard
                key={pool.poolId}
                tokenGarden={tokenGarden as TokenGarden}
                {...pool}
              />
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <h4 className="text-secondary-content">
            Pools in Review ( {poolsInReview.length} )
          </h4>
          <div className="flex flex-row flex-wrap gap-10">
            {poolsInReview.map((pool) => (
              <PoolCard
                key={pool.poolId}
                tokenGarden={tokenGarden as TokenGarden}
                {...pool}
              />
            ))}
          </div>
        </div>
      </section>
      <section className="section-layout">
        <h2 className="mb-4">Covenant</h2>
        <p>{covenant}</p>
        <div className="mt-10 flex justify-center">
          <Image src={groupFlowers} alt="flowers" className="w-[265px]" />
        </div>
      </section>
    </div>
  );
}
