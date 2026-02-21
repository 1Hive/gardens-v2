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

  strategies = strategies ?? [];

  const canSeeArchivedPools =
    !!isCouncilMember || isCouncilSafe || showArchived;

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

  const streamingPools = strategies.filter(
    (strategy) =>
      PoolTypes[strategy.config?.proposalType] === "streaming" &&
      strategy.isEnabled,
  );

  const activePools = strategies?.filter((strategy) => strategy?.isEnabled);

  const poolsInReview = strategies.filter(
    (strategy) => !strategy.isEnabled && !strategy.archived,
  );

  const poolsArchived = strategies.filter((strategy) => strategy.archived);

  const [selectedPoolFilters, setSelectedPoolFilters] = useState<
    PoolFilterKey[]
  >(["funding"]);
  const [poolFilterHint, setPoolFilterHint] = useState<string | null>(null);

  const poolCounts = useMemo<Record<PoolFilterKey, number>>(
    () => ({
      funding: fundingPools.length,
      signaling: signalingPools.length,
      streaming: streamingPools.length,
      inReview: poolsInReview.length,
      archive: poolsArchived.length,
    }),
    [
      fundingPools.length,
      signalingPools.length,
      streamingPools.length,
      poolsInReview.length,
      poolsArchived.length,
    ],
  );

  const filteredPools = useMemo(() => {
    const poolGroups: Record<PoolFilterKey, Pool[]> = {
      funding: fundingPools,
      signaling: signalingPools,
      streaming: streamingPools,
      inReview: poolsInReview,
      archive: canSeeArchivedPools ? poolsArchived : [],
    };
    const seenPools = new Set<string>();

    return selectedPoolFilters
      .flatMap((filterKey) => poolGroups[filterKey] ?? [])
      .filter((pool) => {
        const poolKey = (pool.poolId || pool.id) as string;
        if (seenPools.has(poolKey)) return false;
        seenPools.add(poolKey);
        return true;
      });
  }, [
    selectedPoolFilters,
    fundingPools,
    signalingPools,
    streamingPools,
    poolsInReview,
    poolsArchived,
    canSeeArchivedPools,
  ]);

  const selectedPoolFiltersTitle = useMemo(() => {
    const labels = selectedPoolFilters.map(
      (filter) => POOL_FILTER_LABELS[filter],
    );
    return `${labels.join(", ")} Pools`;
  }, [selectedPoolFilters]);

  const selectedPoolsSummary = useMemo(() => {
    const poolCount = filteredPools.length;
    return `Showing ${poolCount} pool${poolCount === 1 ? "" : "s"}`;
  }, [filteredPools.length]);

  const preferredPoolFilter = useMemo(
    () => getPreferredPoolFilter(poolCounts, canSeeArchivedPools),
    [poolCounts, canSeeArchivedPools],
  );

  const isClearAllDisabled =
    selectedPoolFilters.length === 1 &&
    selectedPoolFilters[0] === preferredPoolFilter;

  const togglePoolFilter = (filter: PoolFilterKey) => {
    setPoolFilterHint(null);
    setSelectedPoolFilters((currentFilters) => {
      if (currentFilters.includes(filter)) {
        const nextFilters = currentFilters.filter((f) => f !== filter);
        return nextFilters.length === 0 ?
            [getPreferredPoolFilter(poolCounts, canSeeArchivedPools)]
          : nextFilters;
      }
      return [...currentFilters, filter];
    });
  };

  const selectAllPoolFilters = () => {
    setPoolFilterHint(null);
    setSelectedPoolFilters(getVisiblePoolFilterPriority(canSeeArchivedPools));
  };

  const clearAllPoolFilters = () => {
    setPoolFilterHint(null);
    setSelectedPoolFilters([preferredPoolFilter]);
  };

  useEffect(() => {
    const visibleFilters =
      canSeeArchivedPools ? selectedPoolFilters : (
        selectedPoolFilters.filter((filter) => filter !== "archive")
      );

    let nextFilters = visibleFilters;
    let nextHint: string | null = null;

    if (nextFilters.length === 0) {
      nextFilters = [getPreferredPoolFilter(poolCounts, canSeeArchivedPools)];
    }

    if (
      nextFilters.length === 1 &&
      nextFilters[0] === "funding" &&
      poolCounts.funding === 0
    ) {
      const fundingFallback = getFundingFallbackPoolFilter(
        poolCounts,
        canSeeArchivedPools,
      );
      if (fundingFallback !== "funding") {
        nextFilters = [fundingFallback];
        nextHint = `No Funding pools yet. Showing ${POOL_FILTER_LABELS[fundingFallback]} (${poolCounts[fundingFallback]}).`;
      }
    }

    const hasSelectionChanged =
      nextFilters.length !== selectedPoolFilters.length ||
      nextFilters.some(
        (filter, index) => filter !== selectedPoolFilters[index],
      );

    if (hasSelectionChanged) {
      setSelectedPoolFilters(nextFilters);
      setPoolFilterHint(nextHint);
      return;
    }

    if (poolFilterHint !== nextHint) {
      setPoolFilterHint(nextHint);
    }
  }, [canSeeArchivedPools, poolCounts, selectedPoolFilters, poolFilterHint]);

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

                {/* Statistic + Register/Leave Button */}
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
                selectedFilters={selectedPoolFilters}
                onToggleFilter={togglePoolFilter}
                onSelectAll={selectAllPoolFilters}
                onClearAll={clearAllPoolFilters}
                clearAllDisabled={isClearAllDisabled}
                counts={poolCounts}
                showArchiveFilter={canSeeArchivedPools}
              />
              {poolFilterHint && (
                <p className="sm:text-sm text-neutral-soft-content ">
                  {poolFilterHint}
                </p>
              )}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h6 className="text-neutral-soft-content">
                  {selectedPoolFiltersTitle}
                </h6>
                <p className="text-xs text-neutral-soft-content">
                  {selectedPoolsSummary}
                </p>
              </div>
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
                  <Link href={createPoolHref}>
                    <Button
                      btnStyle="outline"
                      disabled={!isConnected || missmatchUrl}
                      tooltip={tooltipMessage}
                      icon={<PlusIcon height={16} width={16} />}
                    >
                      Create New Pool
                    </Button>
                  </Link>
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

      {/* Mobile Layout with Tabs */}
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

              {/* Pools Section */}
              <div className="flex flex-col gap-4">
                <PoolFiltersUI
                  selectedFilters={selectedPoolFilters}
                  onToggleFilter={togglePoolFilter}
                  onSelectAll={selectAllPoolFilters}
                  onClearAll={clearAllPoolFilters}
                  clearAllDisabled={isClearAllDisabled}
                  counts={poolCounts}
                  showArchiveFilter={canSeeArchivedPools}
                />
                {poolFilterHint && (
                  <p className="text-xs text-neutral-soft-content">
                    {poolFilterHint}
                  </p>
                )}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h6 className="text-neutral-soft-content">
                    {selectedPoolFiltersTitle}
                  </h6>
                  <p className="text-xs text-neutral-soft-content">
                    {selectedPoolsSummary}
                  </p>
                </div>
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
                    <Link href={createPoolHref} className="w-full sm:w-auto">
                      <Button
                        btnStyle="outline"
                        disabled={!isConnected || missmatchUrl}
                        tooltip={tooltipMessage}
                        icon={<PlusIcon height={16} width={16} />}
                        className="w-full sm:w-auto"
                      >
                        Create New Pool
                      </Button>
                    </Link>
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

      {/* Shared members modal: keep a single dialog instance mounted */}
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
type Pool = Pick<
  CVStrategy,
  "id" | "archived" | "isEnabled" | "poolId" | "metadataHash"
> & {
  proposals: Pick<CVProposal, "id">[];
  config: Pick<CVStrategyConfig, "proposalType" | "pointSystem">;
  token: any;
  metadata?: Maybe<Omit<PoolMetadata, "id">>;
};

type PoolFilterKey =
  | "funding"
  | "signaling"
  | "streaming"
  | "inReview"
  | "archive";

const POOL_FILTERS: { key: PoolFilterKey; label: string }[] = [
  { key: "funding", label: "Funding" },
  { key: "streaming", label: "Streaming" },
  { key: "signaling", label: "Signaling" },
  { key: "inReview", label: "In Review" },
  { key: "archive", label: "Archive" },
];

const POOL_FILTER_PRIORITY: PoolFilterKey[] = [
  "funding",
  "streaming",
  "signaling",
  "inReview",
  "archive",
];

const POOL_FILTER_LABELS: Record<PoolFilterKey, string> = {
  funding: "Funding",
  streaming: "Streaming",
  signaling: "Signaling",
  inReview: "In Review",
  archive: "Archive",
};

const POOL_FILTER_BADGE_STYLES: Record<PoolFilterKey, string> = {
  funding: "bg-tertiary-soft dark:bg-tertiary-dark text-tertiary-content",
  signaling: "bg-primary-soft text-primary-content dark:bg-primary-soft-dark",
  streaming: "bg-tertiary-soft text-tertiary-content dark:bg-tertiary-dark",
  inReview:
    "bg-secondary-soft dark:bg-secondary-soft-dark text-secondary-content",
  archive: "bg-danger-soft text-danger-content dark:bg-danger-soft-dark",
};

const getVisiblePoolFilterPriority = (
  canSeeArchivedPools: boolean,
): PoolFilterKey[] =>
  canSeeArchivedPools ? POOL_FILTER_PRIORITY : (
    POOL_FILTER_PRIORITY.filter((filter) => filter !== "archive")
  );

const getPreferredPoolFilter = (
  counts: Record<PoolFilterKey, number>,
  canSeeArchivedPools: boolean,
): PoolFilterKey =>
  getVisiblePoolFilterPriority(canSeeArchivedPools).find(
    (filter) => counts[filter] > 0,
  ) ?? "funding";

const getFundingFallbackPoolFilter = (
  counts: Record<PoolFilterKey, number>,
  canSeeArchivedPools: boolean,
): PoolFilterKey =>
  getVisiblePoolFilterPriority(canSeeArchivedPools).find(
    (filter) => filter !== "funding" && counts[filter] > 0,
  ) ?? "funding";

interface PoolFiltersUIProps {
  selectedFilters: PoolFilterKey[];
  onToggleFilter: (filter: PoolFilterKey) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  clearAllDisabled: boolean;
  counts: Record<PoolFilterKey, number>;
  showArchiveFilter: boolean;
}

const PoolFiltersUI = ({
  selectedFilters,
  onToggleFilter,
  onSelectAll,
  onClearAll,
  clearAllDisabled,
  counts,
  showArchiveFilter,
}: PoolFiltersUIProps) => {
  const visibleFilters =
    showArchiveFilter ? POOL_FILTERS : (
      POOL_FILTERS.filter((filter) => filter.key !== "archive")
    );
  const allVisibleSelected = visibleFilters.every((filter) =>
    selectedFilters.includes(filter.key),
  );

  return (
    <div className="flex flex-col gap-4 sm:gap-3 xl:flex-row xl:items-center xl:justify-between">
      <div className="flex gap-2 sm:gap-3 overflow-x-auto sm:overflow-visible pb-1 sm:pb-0">
        {visibleFilters.map((filter) => (
          <button
            key={filter.key}
            type="button"
            onClick={() => onToggleFilter(filter.key)}
            className={`rounded-full px-3 py-1.5 font-semibold border transition-all duration-150 ease-out whitespace-nowrap ${
              selectedFilters.includes(filter.key) ?
                `${POOL_FILTER_BADGE_STYLES[filter.key]} border-transparent shadow-sm ring-1 ring-black/10`
              : "bg-transparent border-neutral-soft-content/30 text-neutral-soft-content hover:border-neutral-soft-content hover:text-primary-content"
            }`}
          >
            <span className="inline-flex items-center gap-1 text-sm sm:text-md">
              {selectedFilters.includes(filter.key) && (
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
      <div className="mt-1 sm:mt-0 flex items-center gap-5 sm:gap-4 self-end sm:self-auto">
        <button
          type="button"
          className="text-sm font-semibold text-primary-content hover:underline disabled:text-neutral-soft-content disabled:no-underline disabled:cursor-not-allowed"
          onClick={onSelectAll}
          disabled={allVisibleSelected}
        >
          Select all
        </button>
        <button
          type="button"
          className="text-sm font-semibold text-danger-content hover:underline disabled:text-neutral-soft-content disabled:no-underline disabled:cursor-not-allowed"
          onClick={onClearAll}
          disabled={clearAllDisabled}
        >
          Clear all
        </button>
      </div>
    </div>
  );
};
