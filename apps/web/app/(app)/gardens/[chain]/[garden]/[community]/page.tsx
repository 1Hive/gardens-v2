"use client";

import { commImg, groupFlowers } from "@/assets";
import React, { useEffect, useState } from "react";
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
import { Address } from "viem";
import {
  getCommunityDocument,
  getCommunityQuery,
} from "#/subgraph/.graphclient";
import {
  CurrencyDollarIcon,
  ExclamationCircleIcon,
  RectangleGroupIcon,
} from "@heroicons/react/24/outline";
import { poolTypes } from "@/types";
import {
  SCALE_PRECISION,
  SCALE_PRECISION_DECIMALS,
  dn,
  parseToken,
} from "@/utils/numbers";
import { Dnum } from "dnum";
import useSubgraphQueryByChain from "@/hooks/useSubgraphQueryByChain";
import LoadingSpinner from "@/components/LoadingSpinner";

export default function CommunityPage({
  params: { chain, garden: tokenAddr, community: communityAddr },
}: {
  params: { chain: number; garden: string; community: string };
}) {
  const [covenant, setCovenant] = useState<string | undefined>();
  const { data: result, error } = useSubgraphQueryByChain<getCommunityQuery>(
    chain,
    getCommunityDocument,
    { communityAddr: communityAddr, tokenAddr: tokenAddr },
    {},
    [
      { topic: "community", id: communityAddr, chainId: chain },
      { topic: "member", chainId: chain, containerId: communityAddr },
    ],
  );

  useEffect(() => {
    if (error) {
      console.error("Error while fetching community data: ", error);
    }
  }, [error]);

  const covenantIpfsHash = result?.registryCommunity?.covenantIpfsHash;
  let tokenGarden = result?.tokenGarden;

  useEffect(() => {
    const fetchCovenant = async () => {
      if (covenantIpfsHash) {
        try {
          const response = await fetch(
            "https://ipfs.io/ipfs/" + covenantIpfsHash,
          );
          const json = await response.json();
          if (typeof json.covenant === "string") {
            setCovenant(json.covenant);
          }
        } catch (error) {
          console.log(error);
        }
      }
    };
    fetchCovenant();
  }, [covenantIpfsHash]);

  if (!tokenGarden || !result?.registryCommunity) {
    return (
      <div className="mt-96">
        <LoadingSpinner />
      </div>
    );
  }

  let {
    communityName,
    members,
    strategies,
    communityFee,
    registerStakeAmount,
    registerToken,
    protocolFee,
  } = result.registryCommunity;

  const communityStakedTokens =
    members?.reduce(
      (acc: bigint, member) => acc + BigInt(member?.stakedTokens),
      0n,
    ) ?? 0;

  strategies = strategies ?? [];

  const signalingPools = strategies.filter(
    (strategy) =>
      poolTypes[strategy.config?.proposalType] === "signaling" &&
      strategy.isEnabled,
  );

  const fundingPools = strategies.filter(
    (strategy) =>
      poolTypes[strategy.config?.proposalType] === "funding" &&
      strategy.isEnabled,
  );

  const poolsInReview = strategies.filter((strategy) => !strategy.isEnabled);

  const activePools = strategies?.filter((strategy) => strategy?.isEnabled);

  const parsedCommunityFee = () => {
    try {
      const membership = [
        BigInt(registerStakeAmount),
        Number(tokenGarden!.decimals),
      ] as dn.Dnum;
      const feePercentage = [
        BigInt(communityFee),
        SCALE_PRECISION_DECIMALS, // adding 2 decimals because 1% == 10.000 == 1e4
      ] as dn.Dnum;

      return dn.multiply(membership, feePercentage);
    } catch (error) {
      console.log(error);
    }
    return [0n, 0] as dn.Dnum;
  };

  const registrationAmount = [
    BigInt(registerStakeAmount),
    tokenGarden.decimals,
  ] as Dnum;

  const totalRegistrationCost =
    BigInt(registerStakeAmount) +
    BigInt(registerStakeAmount) /
      (BigInt(SCALE_PRECISION) / BigInt(communityFee));

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
                number={[BigInt(communityStakedTokens), tokenGarden.decimals]}
                compact={true}
                tokenSymbol={tokenGarden.symbol}
              />
            </Statistic>
            <div className="flex">
              <p className="font-medium">Registration cost:</p>
              <div
                className="tooltip ml-2 flex cursor-pointer items-center text-primary-content"
                data-tip={`Registration amount: ${parseToken(registrationAmount)} ${tokenGarden.symbol}\nCommunity fee: ${parseToken(parsedCommunityFee())} ${tokenGarden.symbol}`}
              >
                <DisplayNumber
                  number={[totalRegistrationCost, tokenGarden.decimals]}
                  className="font-semibold"
                  disableTooltip={true}
                  compact={true}
                  tokenSymbol={tokenGarden.symbol}
                />
                <ExclamationCircleIcon
                  className="ml-2 stroke-2"
                  width={22}
                  height={22}
                />
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <RegisterMember
            tokenSymbol={tokenGarden.symbol ?? ""}
            communityAddress={communityAddr as Address}
            registerToken={tokenAddr as Address}
            registerTokenDecimals={tokenGarden.decimals}
            membershipAmount={registerStakeAmount}
            protocolFee={protocolFee}
            communityFee={communityFee}
          />
        </div>
      </header>
      <IncreasePower
        communityAddress={communityAddr as Address}
        registerToken={registerToken as Address}
        tokenSymbol={tokenGarden.symbol ?? ""}
        registerTokenDecimals={tokenGarden.decimals as number}
        registerStakeAmount={BigInt(registerStakeAmount)}
      />
      <section className="section-layout flex flex-col gap-10">
        <header className="flex justify-between">
          <h2>Pools</h2>
          <FormLink
            href={`/gardens/${chain}/${tokenAddr}/${communityAddr}/create-pool`}
            label="Create Pool"
          />
        </header>
        <div className="flex flex-col gap-4">
          <h4 className="text-secondary-content">
            Funding pools ({fundingPools.length})
          </h4>
          <div className="flex flex-row flex-wrap gap-10">
            {fundingPools.map((pool) => (
              <PoolCard
                key={pool.poolId}
                tokenGarden={tokenGarden}
                pool={pool}
              />
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <h4 className="text-secondary-content">
            Signaling pools ({signalingPools.length})
          </h4>
          <div className="flex flex-row flex-wrap gap-10">
            {signalingPools.map((pool) => (
              <PoolCard
                key={pool.poolId}
                tokenGarden={tokenGarden}
                pool={pool}
              />
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <h4 className="text-secondary-content">
            Pools in Review ({poolsInReview.length})
          </h4>
          <div className="flex flex-row flex-wrap gap-10">
            {poolsInReview.map((pool) => (
              <PoolCard
                key={pool.poolId}
                tokenGarden={tokenGarden}
                pool={pool}
              />
            ))}
          </div>
        </div>
      </section>
      <section className="section-layout">
        <h2 className="mb-4">Covenant</h2>
        {covenantIpfsHash ? (
          covenant ? (
            <p>{covenant}</p>
          ) : (
            <LoadingSpinner></LoadingSpinner>
          )
        ) : (
          <p className="italic">No covenant was submitted.</p>
        )}
        <div className="mt-10 flex justify-center">
          <Image src={groupFlowers} alt="flowers" className="w-[265px]" />
        </div>
      </section>
    </div>
  );
}
