import { commImg, groupFlowers } from "@/assets";
import React from "react";
import Image from "next/image";
import { EthAddress, Identifier, PoolCard, RegisterMember } from "@/components";
import { initUrqlClient, queryByChain } from "@/providers/urql";
import { Address } from "viem";
import {
  RegistryCommunity,
  TokenGarden,
  getCommunityDocument,
  getCommunityQuery,
} from "#/subgraph/.graphclient";

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
    members?.reduce((acc, member) => acc + Number(member?.stakedTokens), 0) ??
    0;

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
  return (
    <div className="flex w-full max-w-6xl flex-col gap-10 p-8">
      <header className="section-layout flex flex-row items-center gap-10">
        <div>
          <Image
            src={commImg}
            alt={`${communityName} community`}
            className="h-[180px] bg-slate-200"
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
            <Identifier label="members" count={members?.length ?? 0} />
            <Identifier label="strategies" count={strategies?.length ?? 0} />
            <Identifier label="staked tokens" count={communityStakedTokens} />
          </div>
        </div>
        <div className="flex flex-col gap-4">
          {/* <div className="flex flex-col gap-2">
            <Identifier
              label="registration amount"
              count={registerStakeAmount}
            />
            <Identifier label="community fee" count={communityFee} />
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
      <section className="section-layout flex flex-col gap-10">
        <header className="">
          <h2>Pools</h2>
        </header>
        <div className="flex flex-col gap-4">
          <h4 className="text-secondary-content">
            Funding pools ( {fundingPools.length} )
          </h4>
          <div className="flex flex-row flex-wrap gap-10">
            {fundingPools.map((pool) => (
              <React.Fragment key={`${pool.poolId}`}>
                <PoolCard tokenGarden={tokenGarden as TokenGarden} {...pool} />
              </React.Fragment>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <h4 className="text-secondary-content">
            Signaling pools ( {signalingPools.length} )
          </h4>
          <div className="flex flex-row flex-wrap gap-10">
            {signalingPools.map((pool) => (
              <React.Fragment key={`${pool.poolId}`}>
                <PoolCard tokenGarden={tokenGarden as TokenGarden} {...pool} />
              </React.Fragment>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <h4 className="text-secondary-content">
            Pools in Review ( {poolsInReview.length} )
          </h4>
          <div className="flex flex-row flex-wrap gap-10">
            {poolsInReview.map((pool) => (
              <React.Fragment key={`${pool.poolId}`}>
                <PoolCard
                  tokenGarden={tokenGarden as TokenGarden}
                  {...pool}
                  enabled={false}
                />
              </React.Fragment>
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
