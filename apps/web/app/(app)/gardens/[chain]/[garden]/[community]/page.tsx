"use client";

import React, { Fragment, useEffect, useRef, useState } from "react";
import {
  CurrencyDollarIcon,
  PlusIcon,
  RectangleGroupIcon,
  UserGroupIcon,
  ArrowTopRightOnSquareIcon,
} from "@heroicons/react/24/outline";

import { FetchTokenResult } from "@wagmi/core";
import { Dnum, multiply } from "dnum";
import Image from "next/image";
import Link from "next/link";
import { Address } from "viem";
import { useAccount, useContractRead, useToken } from "wagmi";
import {
  getCommunityDocument,
  getCommunityQuery,
  isMemberDocument,
  isMemberQuery,
} from "#/subgraph/.graphclient";
import {
  CommunityLogo,
  groupFlowers,
  BlockscoutLogo,
  ProtopianLogo,
  OneHiveLogo,
} from "@/assets";
import {
  Button,
  DisplayNumber,
  EthAddress,
  IncreasePower,
  PoolCard,
  RegisterMember,
  Statistic,
  InfoWrapper,
  DataTable,
} from "@/components";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import MarkdownWrapper from "@/components/MarkdownWrapper";
import { Skeleton } from "@/components/Skeleton";
import { TokenGardenFaucet } from "@/components/TokenGardenFaucet";
import { isProd } from "@/configs/isProd";
import { QUERY_PARAMS } from "@/constants/query-params";
import { useCollectQueryParams } from "@/contexts/collectQueryParams.context";
import {
  FAKE_PROTOPIAN_COMMUNITIES,
  ONE_HIVE_COMMUNITY_ADDRESS,
  ONE_HIVE_FAKE_COMMUNITY_ADDRESS,
} from "@/globals";
import { useCheat } from "@/hooks/useCheat";
import { useDisableButtons } from "@/hooks/useDisableButtons";
import { useSubgraphQuery } from "@/hooks/useSubgraphQuery";
import { safeABI } from "@/src/generated";
import { PoolTypes, Column } from "@/types";
import { fetchIpfs } from "@/utils/ipfsUtils";
import {
  parseToken,
  SCALE_PRECISION,
  SCALE_PRECISION_DECIMALS,
} from "@/utils/numbers";
import { useChainFromPath } from "@/hooks/useChainFromPath";

type MembersStaked = {
  memberAddress: string;
  stakedTokens: string;
};

type CommunityMetricsProps = {
  membersStaked: MembersStaked[] | undefined;
  tokenGarden: FetchTokenResult;
  communityStakedTokens: number | bigint;
};

type MemberColumn = Column<MembersStaked>;

const BLOCKSCOUT_ADDRESS = "0xa9257a428dc6b192bd1ccc14c0a5a61476c767b9";

export default function Page({
  params: { garden: tokenAddr, community: communityAddr },
}: {
  params: { garden: string; community: string };
}) {
  const searchParams = useCollectQueryParams();
  const { address: accountAddress } = useAccount();
  const [covenant, setCovenant] = useState<string | undefined>();
  const showArchived = useCheat("showArchived");
  const [openCommDetails, setOpenCommDetails] = useState(false);

  const chain = useChainFromPath();

  const covenantSectionRef = useRef<HTMLDivElement>(null);
  const { data: tokenGarden } = useToken({
    address: tokenAddr as Address,
    chainId: chain?.id,
  });

  const {
    data: result,
    error,
    refetch,
  } = useSubgraphQuery<getCommunityQuery>({
    query: getCommunityDocument,
    variables: {
      communityAddr: communityAddr.toLowerCase(),
      tokenAddr: tokenAddr.toLowerCase(),
    },
    changeScope: [
      { topic: "community", id: communityAddr },
      { topic: "member", containerId: communityAddr },
    ],
  });

  const registryCommunity = result?.registryCommunity;
  const isCouncilMember =
    registryCommunity?.councilSafe &&
    accountAddress?.toLowerCase() ===
      registryCommunity.councilSafe.toLowerCase();

  const { data: councilMembers } = useContractRead({
    abi: safeABI,
    address: registryCommunity?.councilSafe as Address,
    functionName: "getOwners",
    chainId: chain?.id,
    enabled: !!registryCommunity?.councilSafe && !!chain?.safePrefix,
    onError: (err) => {
      console.error("Error reading council safe owners:", err);
    },
  });

  const queryAllChains = useCheat("queryAllChains");

  let {
    communityName,
    members,
    strategies,
    communityFee,
    registerStakeAmount,
    protocolFee,
  } = registryCommunity ?? {};

  const is1hive =
    registryCommunity?.id.toLowerCase() ===
    (isProd || queryAllChains ?
      ONE_HIVE_COMMUNITY_ADDRESS
    : ONE_HIVE_FAKE_COMMUNITY_ADDRESS);

  const isProtopianCommunity =
    !!members?.find(
      (x) =>
        x.member.isProtopian &&
        councilMembers?.find(
          (c) => c.toLowerCase() === x.memberAddress?.toLowerCase(),
        ),
    ) ||
    !!FAKE_PROTOPIAN_COMMUNITIES.find(
      (x) => x.toLowerCase() === communityAddr.toLowerCase(),
    );

  const { data: isMemberResult } = useSubgraphQuery<isMemberQuery>({
    query: isMemberDocument,
    variables: {
      me: accountAddress?.toLowerCase(),
      comm: communityAddr.toLowerCase(),
    },
    changeScope: [
      { topic: "community", id: communityAddr },
      { topic: "member", containerId: communityAddr },
    ],
    enabled: accountAddress !== undefined,
  });

  const { tooltipMessage, isConnected, missmatchUrl } = useDisableButtons();

  useEffect(() => {
    if (error) {
      console.error("Error while fetching community data: ", error);
    }
  }, [error]);

  useEffect(() => {
    const fetchCovenant = async () => {
      if (registryCommunity?.covenantIpfsHash) {
        try {
          const json = await fetchIpfs<{ covenant: string }>(
            registryCommunity.covenantIpfsHash,
          );
          if (json && typeof json.covenant === "string") {
            setCovenant(json.covenant);
          }
        } catch (err) {
          console.error(err);
        }
      }
    };
    fetchCovenant();
  }, [registryCommunity?.covenantIpfsHash]);

  const communityStakedTokens =
    members?.reduce(
      (acc: bigint, member) => acc + BigInt(member?.stakedTokens),
      0n,
    ) ?? 0;

  strategies = strategies ?? [];

  const signalingPools = strategies.filter(
    (strategy) =>
      PoolTypes[strategy.config?.proposalType] === "signaling" &&
      strategy.isEnabled,
  );

  const fundingPools = strategies.filter(
    (strategy) =>
      PoolTypes[strategy.config?.proposalType] === "funding" &&
      strategy.isEnabled,
  );
  const activePools = strategies?.filter((strategy) => strategy?.isEnabled);

  const poolsInReview = strategies.filter(
    (strategy) => !strategy.isEnabled && !strategy.archived,
  );

  const poolsArchived = strategies.filter((strategy) => strategy.archived);

  // const [tokenDataArray, setTokenDataArray] = useState([]);

  // useEffect(() => {
  //   // Initialize an empty array for holding token data for each pool
  //   const newTokenDataArray = fundingPools.map((pool) => ({
  //     poolId: pool.poolId,
  //     tokenData: null ,
  //   }));

  //   // Iterate over each pool and use `useToken` to get token data
  //   fundingPools.forEach((pool, index) => {
  //     const { data } = useToken({
  //       address: pool.token as Address,
  //       chainId: chain.id,
  //     });

  //     // Update the tokenData in the array for this specific pool
  //     newTokenDataArray[index].tokenData = data;
  //   });

  //   // Once data is fetched, update the state
  //   setTokenDataArray(newTokenDataArray);
  // }, [fundingPools, chain]);

  useEffect(() => {
    const newPoolId = searchParams[QUERY_PARAMS.communityPage.newPool];
    const isNewCommunity =
      searchParams[QUERY_PARAMS.communityPage.newCommunity];
    const fetchedPools = poolsInReview.some((c) => c.poolId === newPoolId);
    if (isNewCommunity) {
      console.debug("Community: New community, refetching...");
      refetch();
    } else if (
      newPoolId &&
      result &&
      !poolsInReview.some((p) => p.poolId === newPoolId)
    ) {
      console.debug("Community: New pool not yet fetched, refetching...", {
        newPoolId,
        fetchedPools,
      });
      refetch();
    }
  }, [searchParams, poolsInReview]);

  useEffect(() => {
    if (
      searchParams[QUERY_PARAMS.communityPage.covenant] !== undefined &&
      covenantSectionRef.current
    ) {
      const elementTop =
        covenantSectionRef.current.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({
        top: elementTop - 130,
        behavior: "smooth",
      });
    }
  }, [covenantSectionRef.current, searchParams]);

  if (!tokenGarden || !registryCommunity) {
    return (
      <div className="mt-96">
        <LoadingSpinner />
      </div>
    );
  }

  const parsedCommunityFee = () => {
    try {
      const membership = [
        BigInt(registerStakeAmount),
        Number(tokenGarden!.decimals),
      ] as Dnum;
      const feePercentage = [
        BigInt(communityFee),
        SCALE_PRECISION_DECIMALS, // adding 2 decimals because 1% == 10.000 == 1e4
      ] as Dnum;

      return multiply(membership, feePercentage);
    } catch (err) {
      console.error(err);
    }
    return [0n, 0] as Dnum;
  };

  const registrationAmount = [
    BigInt(registerStakeAmount),
    tokenGarden.decimals,
  ] as Dnum;

  const getTotalRegistrationCost = () => {
    registerStakeAmount = +registerStakeAmount;
    protocolFee = +protocolFee;
    communityFee = +communityFee;
    if (registerStakeAmount == undefined) {
      registerStakeAmount = 0;
    }
    const res =
      BigInt(registerStakeAmount) + // Min stake
      (communityFee ?
        BigInt(registerStakeAmount * (communityFee / SCALE_PRECISION))
      : BigInt(0)) + // Commuity fee as % of min stake
      (protocolFee ?
        BigInt(registerStakeAmount * (protocolFee / SCALE_PRECISION))
      : BigInt(0)); // Protocol fee as extra
    return res;
  };

  return (
    <div className="page-layout">
      <header className="section-layout flex flex-row items-center gap-10 flex-wrap justify-end">
        <div className="absolute top-5 right-10 flex flex-col">
          {communityAddr == BLOCKSCOUT_ADDRESS && (
            <>
              <Image
                src={BlockscoutLogo}
                alt={`${communityName} community`}
                className="h-[100px]"
                height={210}
                width={210}
              />
              <a
                href="https://merits.blockscout.com/?tab=campaigns&id=rec66xiX71sN8y4q1&utm_source=landing-page&utm_medium=campaign&utm_campaign=gnosis"
                className="text-tertiary-content text-sm -mt-8 flex items-center justify-center gap-1"
                target="_external"
                rel="noreferrer"
              >
                Learn more about Blockscout Merits{" "}
                <span>
                  <ArrowTopRightOnSquareIcon width={14} height={14} />
                </span>
              </a>
            </>
          )}
        </div>
        <div>
          <Image
            src={
              is1hive ? OneHiveLogo
              : isProtopianCommunity ?
                ProtopianLogo
              : CommunityLogo
            }
            alt={`${communityName} community`}
            className="h-[180px]"
            height={180}
            width={180}
          />
          <Button
            onClick={() => setOpenCommDetails(!openCommDetails)}
            btnStyle="outline"
            className="mt-1"
          >
            {openCommDetails ? "Close" : "View"} Members
          </Button>
        </div>
        <div className="flex flex-1 flex-col gap-2">
          <div>
            <h2>{communityName}</h2>
            <EthAddress
              icon={false}
              address={communityAddr as Address}
              label="Community address"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Statistic
              label="members"
              count={members?.length ?? 0}
              icon={<UserGroupIcon />}
            />
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
            <div className="flex gap-2 items-center">
              <p className="font-medium">Registration stake:</p>
              <InfoWrapper
                tooltip={`Registration amount: ${parseToken(registrationAmount)} ${tokenGarden.symbol}\nCommunity fee: ${parseToken(parsedCommunityFee())} ${tokenGarden.symbol}`}
              >
                <div className="flex">
                  <EthAddress
                    address={tokenGarden.address as Address}
                    shortenAddress={true}
                    actions="none"
                    icon={false}
                    label={
                      <DisplayNumber
                        number={[
                          getTotalRegistrationCost(),
                          tokenGarden?.decimals,
                        ]}
                        className="subtitle2"
                        disableTooltip={true}
                        compact={true}
                        copiable={false}
                        tokenSymbol={tokenGarden.symbol}
                      />
                    }
                  />
                </div>
              </InfoWrapper>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-4 mt-auto">
          <RegisterMember
            memberData={isMemberResult}
            registrationCost={getTotalRegistrationCost()}
            token={tokenGarden}
            registryCommunity={registryCommunity}
          />
        </div>
        {openCommDetails && (
          <CommunityDetailsTable
            membersStaked={registryCommunity.members as MembersStaked[]}
            tokenGarden={tokenGarden}
            communityStakedTokens={communityStakedTokens}
          />
        )}
      </header>

      <IncreasePower
        memberData={isMemberResult}
        registryCommunity={registryCommunity}
        tokenGarden={tokenGarden}
        registrationAmount={registrationAmount}
      />
      <section className="section-layout flex flex-col gap-10">
        <header className="flex justify-between">
          <h2>Pools</h2>
          <Link
            href={`/gardens/${chain}/${tokenAddr}/${communityAddr}/create-pool`}
          >
            <Button
              btnStyle="filled"
              disabled={!isConnected || missmatchUrl}
              tooltip={tooltipMessage}
              icon={<PlusIcon height={24} width={24} />}
            >
              Create Pool
            </Button>
          </Link>
        </header>
        <div className="flex flex-col gap-4">
          <h4 className="text-secondary-content">
            Funding pools ({fundingPools.length})
          </h4>
          <div className="flex flex-row flex-wrap gap-10">
            {fundingPools.map((pool) => (
              <Fragment key={pool.poolId}>
                <PoolCard token={pool.token} chainId={chain!.id!} pool={pool} />
              </Fragment>
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
                token={pool.token}
                chainId={chain!.id!}
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
                token={pool.token}
                chainId={chain!.id!}
                pool={pool}
              />
            ))}
          </div>
        </div>
        {(!!isCouncilMember ||
          accountAddress?.toLowerCase() ===
            registryCommunity.councilSafe?.toLowerCase() ||
          showArchived) && (
          <div className="flex flex-col gap-4">
            <h4 className="text-secondary-content">
              Pools archived ({poolsArchived.length})
            </h4>
            <div className="flex flex-row flex-wrap gap-10">
              {poolsArchived.map((pool) => (
                <PoolCard
                  key={pool.poolId}
                  token={pool.token}
                  chainId={chain!.id!}
                  pool={pool}
                />
              ))}
            </div>
          </div>
        )}
      </section>
      <section ref={covenantSectionRef} className="section-layout">
        <h2 className="mb-4">Covenant</h2>
        {registryCommunity?.covenantIpfsHash ?
          <Skeleton isLoading={!covenant} rows={5}>
            <MarkdownWrapper>{covenant!}</MarkdownWrapper>
          </Skeleton>
        : <p className="italic">No covenant was submitted.</p>}
        <div className="mt-10 flex justify-center">
          <Image
            src={groupFlowers}
            alt="flowers"
            className="w-[265px]"
            width={265}
            height={70}
          />
        </div>
      </section>
      {!isProd && tokenGarden && <TokenGardenFaucet token={tokenGarden} />}
    </div>
  );
}

const CommunityDetailsTable = ({
  membersStaked,
  tokenGarden,
  communityStakedTokens,
}: CommunityMetricsProps) => {
  const columns: MemberColumn[] = [
    {
      header: `Members (${membersStaked?.length})`,
      render: (memberData: MembersStaked) => (
        <EthAddress
          address={memberData.memberAddress as Address}
          actions="copy"
          shortenAddress={false}
          icon="ens"
        />
      ),
    },
    {
      header: "Staked tokens",
      render: (memberData: MembersStaked) => (
        <DisplayNumber
          number={[BigInt(memberData.stakedTokens), tokenGarden.decimals]}
          compact={true}
          tokenSymbol={tokenGarden.symbol}
        />
      ),
      className: "flex justify-end",
    },
  ];

  return (
    <DataTable
      title="Community Members"
      data={membersStaked as MembersStaked[]}
      description="Overview of all community members and the total amount of tokens they have staked."
      columns={columns}
      className="max-h-screen overflow-y-scroll w-full"
      footer={
        <div className="flex justify-between py-2 border-neutral-soft-content">
          <p className="subtitle">Total Staked:</p>
          <DisplayNumber
            number={[BigInt(communityStakedTokens), tokenGarden.decimals]}
            compact={true}
            tokenSymbol={tokenGarden.symbol}
          />
        </div>
      }
    />
  );
};
