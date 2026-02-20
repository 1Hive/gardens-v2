"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

import {
  CircleStackIcon,
  CurrencyDollarIcon,
  PlusIcon,
  TrophyIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import { CheckIcon } from "@heroicons/react/24/solid";

import { FetchTokenResult } from "@wagmi/core";
import { Dnum, multiply } from "dnum";
import { Maybe } from "graphql/jsutils/Maybe";
import Image from "next/image";
import Link from "next/link";
import { Address } from "viem";
import { useAccount, useToken } from "wagmi";
import {
  CVProposal,
  CVStrategy,
  CVStrategyConfig,
  getCommunityDocument,
  getCommunityQuery,
  isMemberDocument,
  isMemberQuery,
  PoolMetadata,
} from "#/subgraph/.graphclient";
import {
  CommunityLogo,
  groupFlowers,
  OneHiveLogo,
  ProtopianLogo,
} from "@/assets";
import {
  Button,
  DataTable,
  DisplayNumber,
  EthAddress,
  IncreasePower,
  InfoWrapper,
  PoolCard,
  RegisterMember,
  Statistic,
} from "@/components";
import { Divider } from "@/components/Diivider";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import MarkdownWrapper from "@/components/MarkdownWrapper";
import { Skeleton } from "@/components/Skeleton";
import { TokenGardenFaucet } from "@/components/TokenGardenFaucet";
import { isProd } from "@/configs/isProd";
import { QUERY_PARAMS } from "@/constants/query-params";
import { useCollectQueryParams } from "@/contexts/collectQueryParams.context";
import { usePubSubContext } from "@/contexts/pubsub.context";
import { ONE_HIVE_COMMUNITY_ADDRESS } from "@/globals";
import { useChainFromPath } from "@/hooks/useChainFromPath";
import { useContractWriteWithConfirmations } from "@/hooks/useContractWriteWithConfirmations";
import { useCouncil } from "@/hooks/useCouncil";
import { useDisableButtons } from "@/hooks/useDisableButtons";
import { useFlag } from "@/hooks/useFlag";
import { useIpfsFetch } from "@/hooks/useIpfsFetch";
import { useSubgraphQuery } from "@/hooks/useSubgraphQuery";
import { getProtopiansOwners } from "@/services/alchemy";
import { registryCommunityABI } from "@/src/generated";
import { Column, PoolTypes } from "@/types";
import {
  calculatePercentageBigInt,
  formatCountWhenPlus1k,
  parseToken,
  SCALE_PRECISION,
  SCALE_PRECISION_DECIMALS,
} from "@/utils/numbers";

type MembersStaked = {
  memberAddress: string;
  stakedTokens: string;
};

type CommunityMetricsProps = {
  membersStaked: MembersStaked[] | undefined;
  tokenGarden: FetchTokenResult;
  communityName: string;
  communityStakedTokens: number | bigint;
  openMembersModal: boolean;
  setOpenMembersModal: (open: boolean) => void;
};

type MemberColumn = Column<MembersStaked>;

export default function ClientPage({
  params: { garden: tokenAddr, community: communityAddr },
}: {
  params: { garden: string; community: string };
}) {
  const searchParams = useCollectQueryParams();
  const { address: accountAddress } = useAccount();
  const showArchived = useFlag("showArchived");
  const isFetchingNFT = useRef<boolean>(false);
  const { publish } = usePubSubContext();
  const chain = useChainFromPath();
  const [openMembersModal, setOpenMembersModal] = useState(false);
  const [selectedTab, setSelectedTab] = useState(0);

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

  const { data: covenantResult } = useIpfsFetch<{ covenant: string }>({
    hash: registryCommunity?.covenantIpfsHash,
    enabled: registryCommunity != null && !registryCommunity.covenant,
  });

  const covenant =
    registryCommunity?.covenant?.text ?? covenantResult?.covenant;

  const { isCouncilSafe, isCouncilMember, councilMembers } = useCouncil({
    strategyOrCommunity: registryCommunity,
    detectCouncilMember: true,
  });

  let {
    communityName,
    members,
    strategies,
    communityFee,
    registerStakeAmount,
    protocolFee,
    membersCount,
  } = registryCommunity ?? {};

  const is1hive =
    registryCommunity?.id.toLowerCase() === ONE_HIVE_COMMUNITY_ADDRESS;

  const [isProtopianCommunity, setIsProtopianCommunity] = useState<
    boolean | undefined
  >(undefined);

  useEffect(() => {
    if (
      !councilMembers ||
      isProtopianCommunity != undefined ||
      isFetchingNFT.current ||
      !result?.registryCommunity?.councilSafe
    )
      return;

    isFetchingNFT.current = true;

    // Fetch alchemy data to determine if the community is Protopian

    getProtopiansOwners()
      .then((protopianOwners) => {
        setIsProtopianCommunity(
          // Consider Protopian can be transferred to councilSafe
          !!protopianOwners.find((x) =>
            [...councilMembers, result!.registryCommunity!.councilSafe!]?.find(
              (cm) => cm.toLowerCase() === x.toLowerCase(),
            ),
          ),
        );
      })
      .catch((err) => {
        console.error("Error fetching Protopian community data:", err);
        setIsProtopianCommunity(false);
      })
      .finally(() => {
        isFetchingNFT.current = false;
      });
  }, [councilMembers, result?.registryCommunity?.councilSafe]);

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

  const { write: writeSetArchive, isLoading: isSetArchiveLoading } =
    useContractWriteWithConfirmations({
      address: registryCommunity?.id as Address,
      abi: registryCommunityABI,
      contractName: "Registry Community",
      functionName: "setArchived",
      onConfirmations: () => {
        publish({
          topic: "community",
          type: "update",
          id: communityAddr,
          function: "setArchived",
          containerId: communityAddr,
        });
      },
    });

  const { tooltipMessage, isConnected, missmatchUrl, isButtonDisabled } =
    useDisableButtons();
  const createPoolHref = `/gardens/${chain?.id}/${tokenAddr}/${communityAddr}/create-pool`;

  useEffect(() => {
    if (error) {
      console.error("Error while fetching community data: ", error);
    }
  }, [error]);

  const communityStakedTokens =
    members?.reduce(
      (acc: bigint, member) => acc + BigInt(member?.stakedTokens),
      0n,
    ) ?? 0;

  const communityStrategies = strategies ?? [];

  const canSeeArchivedPools =
    !!isCouncilMember || isCouncilSafe || showArchived;

  const activePools = communityStrategies.filter(
    (strategy) => strategy.isEnabled,
  );

  const poolsInReview = communityStrategies.filter(
    (strategy) => !strategy.isEnabled && !strategy.archived,
  );

  const poolsArchived = communityStrategies.filter(
    (strategy) => strategy.archived,
  );

  const [poolStatusFilter, setPoolStatusFilter] =
    useState<PoolStatusFilterKey>("active");

  const poolCounts = useMemo<Record<PoolStatusFilterKey, number>>(
    () => ({
      all:
        canSeeArchivedPools ?
          communityStrategies.length
        : communityStrategies.filter((strategy) => !strategy.archived).length,
      active: activePools.length,
      inReview: poolsInReview.length,
      archive: canSeeArchivedPools ? poolsArchived.length : 0,
    }),
    [
      canSeeArchivedPools,
      communityStrategies,
      activePools.length,
      poolsInReview.length,
      poolsArchived.length,
    ],
  );

  const toBigIntSafe = (value: unknown): bigint => {
    try {
      if (typeof value === "bigint") return value;
      if (typeof value === "number") return BigInt(Math.trunc(value));
      if (typeof value === "string") return value ? BigInt(value) : 0n;
      return 0n;
    } catch {
      return 0n;
    }
  };

  const activePoolsSorted = useMemo(() => {
    const poolTypeRank = (pool: (typeof activePools)[number]) => {
      const proposalType = Number(
        (pool.config as { proposalType?: unknown })?.proposalType ?? -1,
      );
      const poolType = PoolTypes[proposalType];
      if (poolType === "funding") return 0;
      if (poolType === "streaming") return 1;
      if (poolType === "signaling") return 2;
      return 3;
    };

    return [...activePools].sort((poolA, poolB) => {
      const typeRankDiff = poolTypeRank(poolA) - poolTypeRank(poolB);
      if (typeRankDiff !== 0) return typeRankDiff;

      const poolAId = toBigIntSafe(poolA.poolId);
      const poolBId = toBigIntSafe(poolB.poolId);
      if (poolAId === poolBId) return 0;
      return poolAId > poolBId ? 1 : -1;
    });
  }, [activePools]);

  const poolsInReviewSorted = useMemo(
    () =>
      [...poolsInReview].sort((poolA, poolB) => {
        const poolAId = toBigIntSafe(poolA.poolId);
        const poolBId = toBigIntSafe(poolB.poolId);
        if (poolAId === poolBId) return 0;
        return poolAId > poolBId ? 1 : -1;
      }),
    [poolsInReview],
  );

  const poolsArchivedSorted = useMemo(
    () =>
      [...poolsArchived].sort((poolA, poolB) => {
        const poolAId = toBigIntSafe(poolA.poolId);
        const poolBId = toBigIntSafe(poolB.poolId);
        if (poolAId === poolBId) return 0;
        return poolAId > poolBId ? 1 : -1;
      }),
    [poolsArchived],
  );

  const filteredPools = useMemo(() => {
    switch (poolStatusFilter) {
      case "all":
        return canSeeArchivedPools ?
            [
              ...activePoolsSorted,
              ...poolsInReviewSorted,
              ...poolsArchivedSorted,
            ]
          : [...activePoolsSorted, ...poolsInReviewSorted];
      case "active":
        return activePoolsSorted;
      case "inReview":
        return poolsInReviewSorted;
      case "archive":
        return canSeeArchivedPools ? poolsArchivedSorted : [];
      default:
        return activePoolsSorted;
    }
  }, [
    poolStatusFilter,
    activePoolsSorted,
    poolsInReviewSorted,
    poolsArchivedSorted,
    canSeeArchivedPools,
  ]);

  useEffect(() => {
    if (!canSeeArchivedPools && poolStatusFilter === "archive") {
      setPoolStatusFilter("active");
    }
  }, [canSeeArchivedPools, poolStatusFilter]);

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
      <div className="mt-96 col-span-12">
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

  const registerStakeAmountValue = registerStakeAmount ?? 0;
  const registerStakeAmountBn = BigInt(registerStakeAmountValue);
  const protocolFeeScaled = protocolFee != null ? BigInt(protocolFee) : 0n;
  const communityFeeScaled = communityFee != null ? BigInt(communityFee) : 0n;

  const communityFeeAmount =
    communityFeeScaled > 0n ?
      (registerStakeAmountBn * communityFeeScaled) / BigInt(SCALE_PRECISION)
    : 0n;
  const protocolFeeAmount =
    protocolFeeScaled > 0n ?
      (registerStakeAmountBn * protocolFeeScaled) / BigInt(SCALE_PRECISION)
    : 0n;

  const totalRegistrationCost =
    registerStakeAmountBn + // Min stake
    communityFeeAmount + // Community fee as % of min stake
    protocolFeeAmount; // Protocol fee as extra

  return (
    <>
      {/* Desktop Layout */}
      <div className="hidden md:block col-span-12 xl:col-span-9">
        <div className="backdrop-blur-sm flex flex-col gap-10">
          <header className="border border-gray-200 shadow-sm section-layout">
            <div className="flex flex-col sm:flex-row items-start space-y-4 sm:space-y-0 sm:space-x-4">
              {/* Image */}
              <div className="flex-shrink-0">
                <div className="w-20 h-20 lg:w-24 lg:h-24 bg-primary-soft rounded-xl flex items-center justify-center shadow-sm p-1">
                  <Image
                    src={
                      is1hive ? OneHiveLogo
                      : isProtopianCommunity ?
                        ProtopianLogo
                      : CommunityLogo
                    }
                    alt={`${communityName} community`}
                  />
                </div>
              </div>

              <div className="flex-1 flex-col lg:items-start lg:justify-between sm:gap-4 ">
                {/* Community name + Address */}
                <div className=" flex-flex-col">
                  <h2>{communityName}</h2>
                  <EthAddress
                    icon={false}
                    address={communityAddr as Address}
                    label="Community address"
                    textColor="var(--color-grey-900)"
                    explorer="louper"
                  />
                  {registryCommunity?.councilSafe && (
                    <EthAddress
                      icon={false}
                      address={registryCommunity.councilSafe as Address}
                      label="Council safe"
                      textColor="var(--color-grey-900)"
                    />
                  )}
                </div>

                {/* Statistic + Join/Leave community Button */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between ">
                  <div className="w-full flex flex-col sm:flex-row gap-2 md:gap-6 sm:flex-wrap">
                    <Statistic
                      label="members"
                      count={membersCount ?? 0}
                      icon={<UserGroupIcon />}
                    />

                    <Statistic
                      label="pools"
                      icon={<CircleStackIcon />}
                      count={activePools.length ?? 0}
                    />

                    <Statistic
                      label="staked tokens"
                      icon={<CurrencyDollarIcon />}
                    >
                      <DisplayNumber
                        number={[
                          BigInt(communityStakedTokens),
                          tokenGarden.decimals,
                        ]}
                        compact={true}
                        tokenSymbol={tokenGarden.symbol}
                      />
                    </Statistic>
                  </div>
                  <div className="absolute top-12 md:top-7 right-5 flex items-center gap-2 z-50">
                    {(isCouncilMember || isCouncilSafe) && (
                      <Button
                        btnStyle="outline"
                        color="secondary"
                        disabled={isButtonDisabled || isCouncilMember}
                        tooltip={
                          tooltipMessage ? tooltipMessage
                          : isCouncilMember ?
                            "Connect with Council Safe"
                          : "Archive this community will hide it from being listed in the home page but will remain accessible through a link."

                        }
                        forceShowTooltip={result.registryCommunity?.archived}
                        onClick={() =>
                          writeSetArchive({
                            args: [!result.registryCommunity?.archived],
                          })
                        }
                        isLoading={isSetArchiveLoading}
                      >
                        {result.registryCommunity?.archived ?
                          "Unarchive"
                        : "Archive"}
                      </Button>
                    )}
                    <RegisterMember
                      memberData={accountAddress ? isMemberResult : undefined}
                      registrationCost={totalRegistrationCost}
                      token={tokenGarden}
                      registryCommunity={registryCommunity}
                    />
                  </div>
                </div>

                {/* Registration Stake Value + Community staking leaderboard Button*/}
                <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center mt-2 sm:justify-between">
                  <div className="flex gap-1 items-center ">
                    <p className="subtitle2">Registration stake:</p>
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
                                totalRegistrationCost,
                                tokenGarden?.decimals,
                              ]}
                              valueClassName="text-xl font-bold"
                              disableTooltip={true}
                              compact={true}
                              copiable={true}
                              tokenSymbol={tokenGarden.symbol}
                            />
                          }
                        />
                      </div>
                    </InfoWrapper>
                  </div>
                  <Button
                    onClick={() => setOpenMembersModal(!openMembersModal)}
                    btnStyle="outline"
                    color="tertiary"
                    icon={<TrophyIcon className="h-4 w-4" />}
                  >
                    Community Staking Leaderboard
                  </Button>
                </div>
              </div>
            </div>
          </header>

          <section className="flex flex-col gap-6 section-layout">
            <div className="flex items-center justify-between">
              <h2>Pools</h2>
              <Link href={createPoolHref}>
                <Button
                  btnStyle="filled"
                  disabled={!isConnected || missmatchUrl}
                  tooltip={tooltipMessage}
                  icon={<PlusIcon height={24} width={24} />}
                >
                  Create New Pool
                </Button>
              </Link>
            </div>
            {/* Pools Section */}
            <div className="flex flex-col gap-4 ">
              <PoolFiltersUI
                selectedFilter={poolStatusFilter}
                onSelectFilter={setPoolStatusFilter}
                counts={poolCounts}
                showArchiveFilter={canSeeArchivedPools}
              />
              {filteredPools.length > 0 ?
                <div className="pool-layout">
                  {filteredPools.map((pool) => (
                    <PoolCard
                      key={pool.poolId}
                      pool={pool}
                      token={pool.token}
                    />
                  ))}
                </div>
              : <div className="rounded-xl border border-neutral-soft-content/20 p-6 flex flex-col items-center text-center gap-3">
                  <p className="text-neutral-soft-content">
                    No pools match the selected filters.
                  </p>
                </div>
              }
            </div>
          </section>

          <section ref={covenantSectionRef} className="p-8 section-layout">
            <h2 className="mb-4">Covenant</h2>
            {registryCommunity?.covenantIpfsHash ?
              <Skeleton isLoading={!covenant} rows={5}>
                <MarkdownWrapper source={covenant} />
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
          {!isProd && <TokenGardenFaucet token={tokenGarden} />}
        </div>
      </div>

      {/* Desktop Right Sidebar - Stake component */}
      <div className="hidden md:block col-span-12 xl:col-span-3">
        <div className="backdrop-blur-sm rounded-lg flex flex-col gap-2 sticky top-32">
          <IncreasePower
            memberData={accountAddress ? isMemberResult : undefined}
            registryCommunity={registryCommunity}
            tokenGarden={tokenGarden}
            registrationAmount={registrationAmount}
          />
        </div>
      </div>

      {/* ================= MOBILE ================= */}

      <div className="block md:hidden col-span-12">
        <div
          role="tablist"
          className="tabs tabs-boxed w-full border1 bg-neutral p-1"
          aria-label="Community sections"
        >
          {["Overview", "Pools", "Covenant"].map((label, index) => (
            <button
              key={label}
              type="button"
              role="tab"
              className={`tab rounded-lg border-0 text-neutral-soft-content ${selectedTab === index ? "tab-active !bg-primary-button dark:!bg-primary-dark-base !text-neutral-inverted-content" : "hover:text-neutral-content"}`}
              aria-selected={selectedTab === index}
              onClick={() => setSelectedTab(index)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-4">
          {/* Overview Tab */}
          {selectedTab === 0 && (
            <div className="backdrop-blur-sm flex flex-col gap-6">
              <header className="border border-gray-200 shadow-sm section-layout">
                <div className="flex flex-col items-start space-y-4">
                  {/* Image */}
                  <div className="flex-shrink-0">
                    <div className="w-20 h-20 bg-primary-soft rounded-xl flex items-center justify-center shadow-sm p-1">
                      <Image
                        src={
                          is1hive ? OneHiveLogo
                          : isProtopianCommunity ?
                            ProtopianLogo
                          : CommunityLogo
                        }
                        alt={`${communityName} community`}
                      />
                    </div>
                  </div>

                  <div className="flex-1 w-full flex-col gap-4">
                    {/* Community name + Address */}
                    <div className="mb-3">
                      <h2>{communityName}</h2>
                      <EthAddress
                        icon={false}
                        address={communityAddr as Address}
                        label="Community address"
                        textColor="var(--color-grey-900)"
                        explorer="louper"
                      />
                      {registryCommunity?.councilSafe && (
                        <EthAddress
                          icon={false}
                          address={registryCommunity.councilSafe as Address}
                          label="Council safe"
                          textColor="var(--color-grey-900)"
                        />
                      )}
                    </div>

                    {/* Statistics */}
                    <div className="w-full flex flex-col gap-2">
                      <Statistic
                        label="members"
                        count={membersCount ?? 0}
                        icon={<UserGroupIcon />}
                      />

                      <Statistic
                        label="pools"
                        icon={<CircleStackIcon />}
                        count={activePools.length ?? 0}
                      />

                      <Statistic
                        label="staked tokens"
                        icon={<CurrencyDollarIcon />}
                      >
                        <DisplayNumber
                          number={[
                            BigInt(communityStakedTokens),
                            tokenGarden.decimals,
                          ]}
                          compact={true}
                          tokenSymbol={tokenGarden.symbol}
                        />
                      </Statistic>
                    </div>

                    <Divider />

                    {/* Action Buttons */}
                    <div className="flex flex-col gap-2 mt-4">
                      {(isCouncilMember || isCouncilSafe) && (
                        <Button
                          btnStyle="outline"
                          color="secondary"
                          disabled={isButtonDisabled || isCouncilMember}
                          tooltip={
                            tooltipMessage ? tooltipMessage
                            : isCouncilMember ?
                              "Connect with Council Safe"
                            : "Archive this community will hide it from being listed in the home page but will remain accessible through a link."

                          }
                          forceShowTooltip={result.registryCommunity?.archived}
                          onClick={() =>
                            writeSetArchive({
                              args: [!result.registryCommunity?.archived],
                            })
                          }
                          isLoading={isSetArchiveLoading}
                          className="w-full"
                        >
                          {result.registryCommunity?.archived ?
                            "Unarchive"
                          : "Archive"}
                        </Button>
                      )}
                      <RegisterMember
                        memberData={accountAddress ? isMemberResult : undefined}
                        registrationCost={totalRegistrationCost}
                        token={tokenGarden}
                        registryCommunity={registryCommunity}
                      />
                    </div>

                    <Divider className="mt-4" />

                    {/* Registration Stake Value */}
                    <div className="flex flex-col gap-2">
                      <div className="flex gap-1 items-center flex-wrap">
                        <p className="subtitle2">Registration stake:</p>
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
                                    totalRegistrationCost,
                                    tokenGarden?.decimals,
                                  ]}
                                  valueClassName="text-md sm:text-lg font-bold"
                                  disableTooltip={true}
                                  compact={true}
                                  copiable={true}
                                  tokenSymbol={tokenGarden.symbol}
                                />
                              }
                            />
                          </div>
                        </InfoWrapper>
                      </div>
                      <Button
                        onClick={() => setOpenMembersModal(!openMembersModal)}
                        btnStyle="outline"
                        color="tertiary"
                        icon={<TrophyIcon className="h-4 w-4" />}
                        className="w-full"
                      >
                        Community Staking Leaderboard
                      </Button>
                    </div>
                  </div>
                </div>
              </header>

              {/* Stake component for mobile */}
              <div className="backdrop-blur-sm rounded-lg flex flex-col gap-2">
                <IncreasePower
                  memberData={accountAddress ? isMemberResult : undefined}
                  registryCommunity={registryCommunity}
                  tokenGarden={tokenGarden}
                  registrationAmount={registrationAmount}
                />
              </div>

              {!isProd && <TokenGardenFaucet token={tokenGarden} />}
            </div>
          )}

          {/* Pools Tab */}
          {selectedTab === 1 && (
            <section className="backdrop-blur-sm flex flex-col gap-6 section-layout">
              <div className="flex flex-col gap-4">
                <h2>Pools</h2>
                <Link href={createPoolHref}>
                  <Button
                    btnStyle="filled"
                    disabled={!isConnected || missmatchUrl}
                    tooltip={tooltipMessage}
                    icon={<PlusIcon height={24} width={24} />}
                    className="!w-full sm:!w-auto"
                  >
                    Create New Pool
                  </Button>
                </Link>
              </div>

              {/* Pools Tab */}
              <div className="flex flex-col gap-4">
                <PoolFiltersUI
                  selectedFilter={poolStatusFilter}
                  onSelectFilter={setPoolStatusFilter}
                  counts={poolCounts}
                  showArchiveFilter={canSeeArchivedPools}
                />
                {filteredPools.length > 0 ?
                  <div className="pool-layout">
                    {filteredPools.map((pool) => (
                      <PoolCard
                        key={pool.poolId}
                        pool={pool}
                        token={pool.token}
                      />
                    ))}
                  </div>
                : <div className="rounded-xl border border-neutral-soft-content/20 p-4 flex flex-col items-center text-center gap-3">
                    <p className="text-neutral-soft-content">
                      No pools match the selected filters.
                    </p>
                  </div>
                }
              </div>
            </section>
          )}

          {/* Covenant Tab */}
          {selectedTab === 2 && (
            <section ref={covenantSectionRef} className="p-4 section-layout">
              <h2 className="mb-4">Covenant</h2>
              {registryCommunity?.covenantIpfsHash ?
                <Skeleton isLoading={!covenant} rows={5}>
                  <MarkdownWrapper source={covenant} />
                </Skeleton>
              : <p className="">No covenant was submitted.</p>}
              <div className="mt-10 flex justify-center">
                <Image
                  src={groupFlowers}
                  alt="flowers"
                  className="w-[200px]"
                  width={200}
                  height={53}
                />
              </div>
            </section>
          )}
        </div>
      </div>

      <CommunityDetailsTable
        membersStaked={registryCommunity.members as MembersStaked[]}
        tokenGarden={tokenGarden}
        communityName={communityName ?? "Community"}
        communityStakedTokens={communityStakedTokens}
        openMembersModal={openMembersModal}
        setOpenMembersModal={setOpenMembersModal}
      />
    </>
  );
}

const CommunityDetailsTable = ({
  membersStaked,
  communityName,
  tokenGarden,
  communityStakedTokens,
  openMembersModal,
  setOpenMembersModal,
}: CommunityMetricsProps) => {
  const columns: MemberColumn[] = [
    {
      header: `Members (${formatCountWhenPlus1k(membersStaked?.length ?? 0)})`,
      render: (memberData: MembersStaked) => (
        <EthAddress
          address={memberData.memberAddress as Address}
          actions="copy"
          shortenAddress={true}
          icon="ens"
          textColor="var(--color-grey-900)"
        />
      ),
    },

    {
      header: "Staked tokens",
      render: (memberData: MembersStaked) => (
        <div className="flex items-baseline gap-2">
          <p className="text-xs">
            (
            {calculatePercentageBigInt(
              BigInt(memberData.stakedTokens),
              BigInt(communityStakedTokens),
            )}
            %)
          </p>
          <DisplayNumber
            number={[BigInt(memberData.stakedTokens), tokenGarden.decimals]}
            compact={true}
            tokenSymbol={tokenGarden.symbol}
          />
        </div>
      ),
      className: "flex justify-end",
    },
  ];

  return (
    <DataTable
      openModal={openMembersModal}
      setOpenModal={setOpenMembersModal}
      title={communityName + " Staking Leaderboard"}
      data={membersStaked as MembersStaked[]}
      description="Overview of all community members and the total amount of tokens they have staked."
      columns={columns}
      className="max-h-screen w-full"
      footer={
        <div className="flex justify-between items-center gap-2 mr-8 sm:mr-12">
          <p className="subtitle">Total Staked: </p>
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

// Pool filtering components and types

type PoolStatusFilterKey = "all" | "active" | "inReview" | "archive";

const POOL_STATUS_FILTERS: { key: PoolStatusFilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "inReview", label: "In Review" },
  { key: "archive", label: "Archived" },
];

const POOL_STATUS_FILTER_BADGE_STYLES: Record<PoolStatusFilterKey, string> = {
  all: "bg-tertiary-soft dark:bg-tertiary-dark text-tertiary-content",
  active: "bg-primary-soft text-primary-content dark:bg-primary-soft-dark",
  inReview:
    "bg-secondary-soft dark:bg-secondary-soft-dark text-secondary-content",
  archive: "bg-danger-soft text-danger-content dark:bg-danger-soft-dark",
};

interface PoolFiltersUIProps {
  selectedFilter: PoolStatusFilterKey;
  onSelectFilter: (filter: PoolStatusFilterKey) => void;
  counts: Record<PoolStatusFilterKey, number>;
  showArchiveFilter: boolean;
}

const PoolFiltersUI = ({
  selectedFilter,
  onSelectFilter,
  counts,
  showArchiveFilter,
}: PoolFiltersUIProps) => {
  const visibleFilters =
    showArchiveFilter ? POOL_STATUS_FILTERS : (
      POOL_STATUS_FILTERS.filter((filter) => filter.key !== "archive")
    );

  return (
    <div className="flex gap-2 sm:gap-3 overflow-x-auto sm:overflow-visible pb-1 sm:pb-0">
      {visibleFilters.map((filter) => (
        <button
          key={filter.key}
          type="button"
          onClick={() => onSelectFilter(filter.key)}
          className={`rounded-full px-3 py-1.5 font-semibold border transition-all duration-150 ease-out whitespace-nowrap ${
            selectedFilter === filter.key ?
              `${POOL_STATUS_FILTER_BADGE_STYLES[filter.key]} border-transparent shadow-sm ring-1 ring-black/10`
            : "bg-transparent border-neutral-soft-content/30 text-neutral-soft-content hover:border-neutral-soft-content hover:text-primary-content"
          }`}
        >
          <span className="inline-flex items-center gap-1 text-sm sm:text-md">
            {selectedFilter === filter.key && (
              <CheckIcon className="h-3.5 w-3.5" />
            )}
            {filter.label}
          </span>
          <span className="ml-1 opacity-80 text-xs sm:text-sm">
            ({counts[filter.key] ?? 0})
          </span>
        </button>
      ))}
    </div>
  );
};
