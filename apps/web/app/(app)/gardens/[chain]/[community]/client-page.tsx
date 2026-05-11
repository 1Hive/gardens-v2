"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

import {
  CircleStackIcon,
  CurrencyDollarIcon,
  PlusIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import { CheckIcon } from "@heroicons/react/24/solid";
import { FetchTokenResult } from "@wagmi/core";

import { Dnum, multiply } from "dnum";
import Image from "next/image";
import Link from "next/link";
import { toast } from "react-toastify";
import { Address } from "viem";
import { mainnet } from "viem/chains";
import { useAccount, useToken } from "wagmi";
import {
  getCommunityDocument,
  getCommunityQuery,
  getCommunitiesDocument,
  getCommunitiesQuery,
  isMemberDocument,
  isMemberQuery,
} from "#/subgraph/.graphclient";
import {
  CommunityLogo,
  groupFlowers,
  OneHiveLogo,
  ProtopianLogo,
} from "@/assets";
import {
  Badge,
  Button,
  CommunityStakingLeaderboard,
  DisplayNumber,
  EditCommunityModal,
  EthAddress,
  IncreasePower,
  InfoBox,
  InfoWrapper,
  PoolCard,
  RegisterMember,
  Statistic,
} from "@/components";
import { Divider } from "@/components/Divider";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { LoupeButton } from "@/components/LoupeButton";
import MarkdownWrapper from "@/components/MarkdownWrapper";
import { Skeleton } from "@/components/Skeleton";
import { TokenGardenFaucet } from "@/components/TokenGardenFaucet";
import { chainConfigMap } from "@/configs/chains";
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
import { useHasContractCode } from "@/hooks/useHasContractCode";
import { useIpfsFetch } from "@/hooks/useIpfsFetch";
import { useOwnerOfNFT } from "@/hooks/useOwnerOfNFT";
import { useStreamingPoolsAccess } from "@/hooks/useStreamingPoolsAccess";
import {
  dismissPendingSubgraphRefreshToast,
  useSubgraphQuery,
} from "@/hooks/useSubgraphQuery";
import { useSubgraphQueryMultiChain } from "@/hooks/useSubgraphQueryMultiChain";
import { registryCommunityABI, registryFactoryABI } from "@/src/generated";
import { PoolTypes } from "@/types";
import { logOnce } from "@/utils/log";
import {
  parseToken,
  SCALE_PRECISION,
  SCALE_PRECISION_DECIMALS,
} from "@/utils/numbers";
import { shortenAddress } from "@/utils/text";

type MembersStaked = {
  id: string;
  memberAddress: string;
  stakedTokens: string;
};

type DelegatedProtopianCommunity = {
  id: string;
  communityName?: string | null;
  protopianDelegatedFrom?: string | null;
  chain: {
    id: number;
    name: string;
  };
};

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export default function ClientPage({
  params: { community: communityAddr },
}: {
  params: { community: string };
}) {
  useEffect(() => {
    logOnce(
      "debug",
      "Loading page: (app)/gardens/[chain]/[community]/page.tsx",
    );
  }, []);

  const searchParams = useCollectQueryParams();
  const isNewCommunity =
    searchParams[QUERY_PARAMS.communityPage.newCommunity] !== undefined;
  const { address: accountAddress } = useAccount();
  const showArchived = useFlag("showArchived");
  const canAccessStreamingPools = useStreamingPoolsAccess(communityAddr);
  const pendingNewCommunityRefetch = useRef<string | null>(null);
  const { publish } = usePubSubContext();
  const chain = useChainFromPath();
  const [selectedTab, setSelectedTab] = useState(0);

  const covenantSectionRef = useRef<HTMLDivElement>(null);

  const {
    data: result,
    error,
    refetch,
    fetching,
  } = useSubgraphQuery<getCommunityQuery>({
    query: getCommunityDocument,
    variables: {
      communityAddr: communityAddr?.toLowerCase(),
    },
    changeScope: [
      { topic: "community", id: communityAddr },
      { topic: "member", containerId: communityAddr },
    ],
  });

  const registryCommunity = result?.registryCommunity;
  const isAwaitingNewCommunityIndexing = isNewCommunity && !registryCommunity;
  const tokenAddress = registryCommunity?.garden?.id;
  const { hasContractCode: hasGardenTokenCode } = useHasContractCode({
    address: tokenAddress,
    chainId: chain?.id,
    enabled: !!tokenAddress && chain?.id != null,
  });

  const { data: tokenGarden } = useToken({
    address: tokenAddress as Address,
    chainId: chain?.id,
    enabled: !!tokenAddress && hasGardenTokenCode,
  });
  const resolvedTokenGarden = (tokenGarden ?? registryCommunity?.garden) as
    | FetchTokenResult
    | undefined;

  useEffect(() => {
    if (!registryCommunity || resolvedTokenGarden) {
      return;
    }

    logOnce("debug", "[CommunityPage] token loading condition", {
      communityAddr,
      tokenAddress,
      chainId: chain?.id,
      hasGardenTokenCode,
      hasRegistryCommunity: registryCommunity != null,
      hasSubgraphGarden: registryCommunity.garden != null,
      hasUseTokenData: !!tokenGarden,
      fetching,
      isAwaitingNewCommunityIndexing,
    });
  }, [
    chain?.id,
    communityAddr,
    fetching,
    hasGardenTokenCode,
    isAwaitingNewCommunityIndexing,
    registryCommunity,
    resolvedTokenGarden,
    tokenAddress,
    tokenGarden,
  ]);

  const { data: covenantResult } = useIpfsFetch<{ covenant: string }>({
    hash: registryCommunity?.covenantIpfsHash,
    enabled: registryCommunity != null && !registryCommunity.covenant,
  });

  const covenant =
    registryCommunity?.covenant?.text ?? covenantResult?.covenant;
  const effectivePendingCouncilSafe = registryCommunity?.pendingNewCouncilSafe;
  const effectiveCouncilSafe = registryCommunity?.councilSafe as
    | Address
    | undefined;

  const { isCouncilSafe, isCouncilMember } = useCouncil({
    strategyOrCommunity: registryCommunity,
    detectCouncilMember: true,
  });

  const { isOwner: isProtopianHolder } = useOwnerOfNFT({
    nft: "Protopian",
    chains: [mainnet],
    enabled: accountAddress != null,
  });

  const allDelegationChainIds = useMemo(
    () =>
      Object.values(chainConfigMap)
        .filter(
          (config, index, items) =>
            config.subgraphUrl != null &&
            items.findIndex((entry) => entry.id === config.id) === index,
        )
        .map((config) => config.id),
    [],
  );

  const {
    data: delegatedProtopianCommunitiesResult,
    fetching: isFetchingProtopianDelegations,
  } = useSubgraphQueryMultiChain<getCommunitiesQuery>({
    query: getCommunitiesDocument,
    chainIds: allDelegationChainIds,
    modifier: (data) => {
      const normalizedAccountAddress = accountAddress?.toLowerCase();
      if (normalizedAccountAddress == null) {
        return [];
      }

      return data.flatMap((section) =>
        section.registryCommunities
          .filter(
            (community) =>
              (
                community as { protopianDelegatedFrom?: string | null }
              ).protopianDelegatedFrom?.toLowerCase() ===
              normalizedAccountAddress,
          )
          .map((community) => ({
            id: community.id,
            communityName: community.communityName,
            protopianDelegatedFrom: (
              community as { protopianDelegatedFrom?: string | null }
            ).protopianDelegatedFrom,
            chain: {
              id: section.chain.id,
              name: section.chain.name,
            },
          })),
      );
    },
    changeScope: [{ topic: "community" }],
    enabled: accountAddress != null && isProtopianHolder === true,
  });
  const delegatedProtopianCommunities = delegatedProtopianCommunitiesResult as
    | DelegatedProtopianCommunity[]
    | undefined;

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
  const delegatedFrom = (
    registryCommunity as
      | {
          protopianDelegatedFrom?: string | null;
          registryFactory?: { id?: string | null } | null;
        }
      | undefined
  )?.protopianDelegatedFrom?.toLowerCase();
  const isProtopianCommunity = is1hive || delegatedFrom != null;
  const isDelegatedByMe =
    accountAddress != null &&
    delegatedFrom != null &&
    delegatedFrom === accountAddress.toLowerCase();
  const hasCommunityProtopianDelegation = delegatedFrom != null;
  const existingProtopianDelegation = delegatedProtopianCommunities?.find(
    (community) =>
      !(
        community.id?.toLowerCase() === communityAddr?.toLowerCase() &&
        community.chain.id === chain?.id
      ),
  );
  const hasOtherProtopianDelegation =
    existingProtopianDelegation != null && !isDelegatedByMe;
  const isCheckingOtherProtopianDelegations =
    accountAddress != null &&
    isProtopianHolder === true &&
    isFetchingProtopianDelegations &&
    !isDelegatedByMe;
  const registryFactoryAddress = (
    registryCommunity as
      | {
          protopianDelegatedFrom?: string | null;
          registryFactory?: { id?: string | null } | null;
        }
      | undefined
  )?.registryFactory?.id as Address | undefined;

  const { data: isMemberResult } = useSubgraphQuery<isMemberQuery>({
    query: isMemberDocument,
    variables: {
      me: accountAddress?.toLowerCase(),
      comm: communityAddr?.toLowerCase(),
    },
    changeScope: [
      { topic: "community", id: communityAddr },
      { topic: "member", containerId: communityAddr },
    ],
    enabled: accountAddress !== undefined && communityAddr !== undefined,
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

  const {
    write: writeAcceptCouncilSafe,
    isLoading: isAcceptCouncilSafeLoading,
  } = useContractWriteWithConfirmations({
    address: registryCommunity?.id as Address,
    abi: registryCommunityABI,
    contractName: "Registry Community",
    functionName: "acceptCouncilSafe",
    onConfirmations: () => {
      publish({
        topic: "community",
        type: "update",
        id: communityAddr,
        function: "acceptCouncilSafe",
        containerId: communityAddr,
      });
    },
  });

  const {
    write: writeDelegateProtopian,
    isLoading: isDelegateProtopianLoading,
  } = useContractWriteWithConfirmations({
    address: registryFactoryAddress,
    abi: registryFactoryABI,
    contractName: "Registry Factory",
    functionName: "delegateProtopian",
    onConfirmations: () => {
      toast.success(
        isDelegatedByMe ?
          "Protopian delegation cleared"
        : "Protopian delegated to community",
      );
      publish({
        topic: "community",
        type: "update",
        id: communityAddr,
        function: "delegateProtopian",
        containerId: communityAddr,
      });
      void refetch({ showToast: false });
    },
  });

  const { tooltipMessage, isConnected, missmatchUrl, isButtonDisabled } =
    useDisableButtons();
  const createPoolHref = `/gardens/${chain?.id}/${communityAddr}/create-pool`;

  const normalizedPendingCouncilSafe =
    (
      effectivePendingCouncilSafe != null &&
      effectivePendingCouncilSafe.toLowerCase() !== ZERO_ADDRESS
    ) ?
      effectivePendingCouncilSafe.toLowerCase()
    : null;
  const normalizedCouncilSafe =
    effectiveCouncilSafe != null ? effectiveCouncilSafe.toLowerCase() : null;
  const hasPendingCouncilSafe =
    normalizedPendingCouncilSafe != null &&
    normalizedPendingCouncilSafe !== normalizedCouncilSafe;
  const isPendingCouncilSafeWallet =
    accountAddress != null &&
    normalizedPendingCouncilSafe != null &&
    accountAddress.toLowerCase() === normalizedPendingCouncilSafe;
  const acceptCouncilTooltip =
    !isPendingCouncilSafeWallet && effectivePendingCouncilSafe != null ?
      `Connect with pending council safe ${shortenAddress(effectivePendingCouncilSafe)}`
    : tooltipMessage;
  const delegateProtopianTooltip =
    isCheckingOtherProtopianDelegations ?
      "Checking existing Protopian delegation"
    : hasOtherProtopianDelegation ?
      `Undelegate from ${existingProtopianDelegation.communityName ?? shortenAddress(existingProtopianDelegation.id as Address)} on ${existingProtopianDelegation.chain.name} first`
    : hasCommunityProtopianDelegation && !isDelegatedByMe ?
      `Already delegated by ${shortenAddress(delegatedFrom as Address)}`
    : tooltipMessage;

  useEffect(() => {
    if (error) {
      console.error("Error while fetching community data: ", error);
    }
  }, [error]);

  useEffect(() => {
    if (isNewCommunity && registryCommunity) {
      dismissPendingSubgraphRefreshToast();
    }
  }, [isNewCommunity, registryCommunity]);

  useEffect(() => {
    if (!isNewCommunity) {
      pendingNewCommunityRefetch.current = null;
      return;
    }

    if (registryCommunity) {
      pendingNewCommunityRefetch.current = null;
      return;
    }

    if (fetching) {
      return;
    }

    const communityKey = communityAddr?.toLowerCase();
    if (pendingNewCommunityRefetch.current === communityKey) {
      return;
    }

    pendingNewCommunityRefetch.current = communityKey;
    void refetch({ showToast: false }).finally(() => {
      if (pendingNewCommunityRefetch.current === communityKey) {
        pendingNewCommunityRefetch.current = null;
      }
    });
  }, [communityAddr, fetching, isNewCommunity, refetch, registryCommunity]);

  const communityStakedTokens =
    members?.reduce(
      (acc: bigint, member) => acc + BigInt(member?.stakedTokens),
      0n,
    ) ?? 0;

  const leaderboardMembers = useMemo(
    () =>
      (registryCommunity?.members as MembersStaked[] | undefined)?.map(
        (member) => ({
          ...member,
          id: member.memberAddress.toLowerCase(),
        }),
      ) ?? [],
    [registryCommunity?.members],
  );

  const strategyPoolType = (strategy: {
    config?: { proposalType?: unknown } | null;
  }) => {
    const proposalType = Number(strategy.config?.proposalType ?? -1);
    return PoolTypes[proposalType];
  };

  const communityStrategies = useMemo(
    () =>
      (strategies ?? []).filter(
        (strategy) =>
          canAccessStreamingPools || strategyPoolType(strategy) !== "streaming",
      ),
    [canAccessStreamingPools, strategies],
  );

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
      const poolType = strategyPoolType(pool);
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
    const fetchedPools = poolsInReview.some((c) => c.poolId === newPoolId);
    if (newPoolId && fetchedPools) {
      dismissPendingSubgraphRefreshToast();
    }
    if (isNewCommunity) {
      console.debug("Community: New community, refetching...");
      refetch({ showToast: false });
    } else if (
      newPoolId &&
      result &&
      !poolsInReview.some((p) => p.poolId === newPoolId)
    ) {
      console.debug("Community: New pool not yet fetched, refetching...", {
        newPoolId,
        fetchedPools,
      });
      refetch({ showToast: false });
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

  if (isAwaitingNewCommunityIndexing) {
    return (
      <div className="col-span-12 mt-48 flex justify-center">
        <InfoBox infoBoxType="info" title="Community is still indexing">
          We created this community successfully, but the subgraph has not
          returned it yet. This page will refresh automatically as soon as the
          community is indexed.
        </InfoBox>
      </div>
    );
  }

  if (!resolvedTokenGarden || !registryCommunity) {
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
        Number(resolvedTokenGarden.decimals),
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
    resolvedTokenGarden.decimals,
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
  const headerCardBorderClass =
    registryCommunity.archived ? "!border-warning-content" : "border-gray-200";
  const renderArchivedBadge = () => (
    <Badge color="warning" label="Archived" className="mt-3 w-fit" />
  );

  return (
    <>
      {/* Desktop Layout */}
      <div className="hidden md:block col-span-12 xl:col-span-9">
        <div className="backdrop-blur-sm flex flex-col gap-10">
          <header
            className={`border shadow-sm section-layout ${headerCardBorderClass}`}
          >
            <div className="flex flex-col sm:flex-row items-start space-y-4 sm:space-y-0 sm:space-x-4">
              {/* Image */}
              <div className="flex-shrink-0 flex flex-col items-start">
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
                {registryCommunity.archived && renderArchivedBadge()}
              </div>

              <div className="flex-1 flex-col lg:items-start lg:justify-between sm:gap-4 ">
                <div
                  className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between"
                  data-section="community-header-summary"
                >
                  {/* Community name + Address */}
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className="tooltip tooltip-bottom min-w-0 flex-1"
                        data-tip={communityName ?? ""}
                      >
                        <h2 className="truncate">{communityName}</h2>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <EthAddress
                        icon={false}
                        address={communityAddr as Address}
                        label="Community address"
                        textColor="var(--color-grey-900)"
                        explorer="louper"
                      />
                      <LoupeButton
                        diamond={communityAddr}
                        chainId={chain?.id}
                        className="px-2 py-1"
                      />
                    </div>
                    {effectiveCouncilSafe && (
                      <EthAddress
                        icon={false}
                        address={effectiveCouncilSafe}
                        label="Council safe"
                        textColor="var(--color-grey-900)"
                      />
                    )}
                  </div>

                  <div className="flex w-full flex-wrap items-center gap-2 md:w-auto md:flex-shrink-0 md:justify-end">
                    {(isCouncilMember || isCouncilSafe) &&
                      effectiveCouncilSafe && (
                        <EditCommunityModal
                          communityAddress={registryCommunity.id as Address}
                          communityName={communityName ?? "Community"}
                          communityMembersCount={Number(membersCount ?? 0)}
                          currentCommunityName={communityName ?? ""}
                          currentCouncilSafe={effectiveCouncilSafe}
                          pendingCouncilSafe={
                            effectivePendingCouncilSafe ?? undefined
                          }
                          currentCovenant={covenant ?? ""}
                          tokenDecimals={resolvedTokenGarden.decimals}
                          tokenSymbol={resolvedTokenGarden.symbol}
                          isCouncilSafe={isCouncilSafe}
                          isCouncilMember={isCouncilMember}
                        />
                      )}
                    {(isCouncilMember || isCouncilSafe) && (
                      <Button
                        btnStyle="outline"
                        color="secondary"
                        disabled={
                          isButtonDisabled ||
                          (isCouncilMember && !isCouncilSafe)
                        }
                        tooltip={
                          isCouncilMember && !isCouncilSafe ?
                            "Connect with Council Safe"
                          : tooltipMessage ?
                            tooltipMessage
                          : "Archive this community will hide it from being listed in the home page but will remain accessible through a link."

                        }
                        tooltipSide="tooltip-bottom"
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
                    {hasPendingCouncilSafe && (
                      <Button
                        btnStyle="filled"
                        color="tertiary"
                        disabled={
                          isButtonDisabled ||
                          missmatchUrl ||
                          !isPendingCouncilSafeWallet
                        }
                        tooltip={acceptCouncilTooltip}
                        onClick={() => writeAcceptCouncilSafe()}
                        isLoading={isAcceptCouncilSafeLoading}
                      >
                        Accept Council
                      </Button>
                    )}
                    {isProtopianHolder && registryFactoryAddress && (
                      <Button
                        btnStyle="outline"
                        color="tertiary"
                        disabled={
                          isButtonDisabled ||
                          missmatchUrl ||
                          isCheckingOtherProtopianDelegations ||
                          hasOtherProtopianDelegation ||
                          (hasCommunityProtopianDelegation && !isDelegatedByMe)
                        }
                        tooltip={delegateProtopianTooltip}
                        onClick={() =>
                          writeDelegateProtopian({
                            args: [
                              accountAddress as Address,
                              isDelegatedByMe ?
                                (ZERO_ADDRESS as Address)
                              : (communityAddr as Address),
                            ],
                          })
                        }
                        isLoading={isDelegateProtopianLoading}
                      >
                        {isDelegatedByMe ?
                          "Undelegate Protopian"
                        : "Delegate protopian"}
                      </Button>
                    )}
                    <RegisterMember
                      memberData={accountAddress ? isMemberResult : undefined}
                      registrationCost={totalRegistrationCost}
                      token={resolvedTokenGarden}
                      registryCommunity={registryCommunity}
                    />
                  </div>
                </div>

                {/* Statistics */}
                <div className="w-full flex flex-col gap-2 sm:flex-row sm:flex-wrap md:gap-6">
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
                        resolvedTokenGarden.decimals,
                      ]}
                      compact={true}
                      tokenSymbol={resolvedTokenGarden.symbol}
                    />
                  </Statistic>
                </div>

                {/* Registration Stake Value + Community staking leaderboard Button*/}
                <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center mt-2 sm:justify-between">
                  <div className="flex gap-1 items-center ">
                    <p className="subtitle2">Registration stake:</p>
                    <InfoWrapper
                      tooltip={`Registration amount: ${parseToken(registrationAmount)} ${resolvedTokenGarden.symbol}\nCommunity fee: ${parseToken(parsedCommunityFee())} ${resolvedTokenGarden.symbol}`}
                    >
                      <div className="flex">
                        <EthAddress
                          address={resolvedTokenGarden.address as Address}
                          shortenAddress={true}
                          actions="none"
                          icon={false}
                          label={
                            <DisplayNumber
                              number={[
                                totalRegistrationCost,
                                resolvedTokenGarden?.decimals,
                              ]}
                              valueClassName="text-xl font-bold"
                              disableTooltip={true}
                              compact={true}
                              copiable={true}
                              tokenSymbol={resolvedTokenGarden.symbol}
                            />
                          }
                        />
                      </div>
                    </InfoWrapper>
                  </div>
                  <CommunityStakingLeaderboard
                    membersStaked={leaderboardMembers}
                    tokenGarden={resolvedTokenGarden}
                    communityName={communityName ?? "Community"}
                    communityStakedTokens={communityStakedTokens}
                    communityAddress={registryCommunity.id as Address}
                    isCouncilSafe={isCouncilSafe}
                    isCouncilMember={isCouncilMember}
                  />
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
                  testId="btn-create-pool"
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
          {!isProd && <TokenGardenFaucet token={resolvedTokenGarden} />}
        </div>
      </div>

      {/* Desktop Right Sidebar - Stake component */}
      <div className="hidden md:block col-span-12 xl:col-span-3">
        <div className="backdrop-blur-sm rounded-lg flex flex-col gap-2 sticky top-32">
          <IncreasePower
            memberData={accountAddress ? isMemberResult : undefined}
            registryCommunity={registryCommunity}
            tokenGarden={resolvedTokenGarden}
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
              <header
                className={`border shadow-sm section-layout ${headerCardBorderClass}`}
              >
                <div className="flex flex-col items-start space-y-4">
                  {/* Image */}
                  <div className="flex-shrink-0 flex flex-col items-start">
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
                    {registryCommunity.archived && renderArchivedBadge()}
                  </div>

                  <div className="flex-1 w-full flex-col gap-4">
                    {/* Community name + Address */}
                    <div className="mb-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div
                          className="tooltip tooltip-bottom min-w-0 flex-1"
                          data-tip={communityName ?? ""}
                        >
                          <h2 className="truncate">{communityName}</h2>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <EthAddress
                          icon={false}
                          address={communityAddr as Address}
                          label="Community address"
                          textColor="var(--color-grey-900)"
                          explorer="louper"
                        />
                        <LoupeButton
                          diamond={communityAddr}
                          chainId={chain?.id}
                          className="px-2 py-1"
                        />
                      </div>
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
                            resolvedTokenGarden.decimals,
                          ]}
                          compact={true}
                          tokenSymbol={resolvedTokenGarden.symbol}
                        />
                      </Statistic>
                    </div>

                    <Divider />

                    {/* Action Buttons */}
                    <div className="flex flex-col gap-2 mt-4">
                      {(isCouncilMember || isCouncilSafe) &&
                        effectiveCouncilSafe && (
                          <EditCommunityModal
                            communityAddress={registryCommunity.id as Address}
                            communityName={communityName ?? "Community"}
                            communityMembersCount={Number(membersCount ?? 0)}
                            currentCommunityName={communityName ?? ""}
                            currentCouncilSafe={effectiveCouncilSafe}
                            pendingCouncilSafe={
                              effectivePendingCouncilSafe ?? undefined
                            }
                            currentCovenant={covenant ?? ""}
                            tokenDecimals={resolvedTokenGarden.decimals}
                            tokenSymbol={resolvedTokenGarden.symbol}
                            isCouncilSafe={isCouncilSafe}
                            isCouncilMember={isCouncilMember}
                            className="w-full"
                          />
                        )}
                      {(isCouncilMember || isCouncilSafe) && (
                        <Button
                          btnStyle="outline"
                          color="secondary"
                          disabled={
                            isButtonDisabled ||
                            (isCouncilMember && !isCouncilSafe)
                          }
                          tooltip={
                            isCouncilMember && !isCouncilSafe ?
                              "Connect with Council Safe"
                            : tooltipMessage ?
                              tooltipMessage
                            : "Archive this community will hide it from being listed in the home page but will remain accessible through a link."

                          }
                          tooltipSide="tooltip-bottom"
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
                      {hasPendingCouncilSafe && (
                        <Button
                          btnStyle="filled"
                          color="tertiary"
                          disabled={
                            isButtonDisabled ||
                            missmatchUrl ||
                            !isPendingCouncilSafeWallet
                          }
                          tooltip={acceptCouncilTooltip}
                          onClick={() => writeAcceptCouncilSafe()}
                          isLoading={isAcceptCouncilSafeLoading}
                          className="w-full"
                        >
                          Accept Council
                        </Button>
                      )}
                      {isProtopianHolder && registryFactoryAddress && (
                        <Button
                          btnStyle="filled"
                          color="primary"
                          disabled={
                            isButtonDisabled ||
                            missmatchUrl ||
                            isCheckingOtherProtopianDelegations ||
                            hasOtherProtopianDelegation ||
                            (hasCommunityProtopianDelegation &&
                              !isDelegatedByMe)
                          }
                          tooltip={delegateProtopianTooltip}
                          onClick={() =>
                            writeDelegateProtopian({
                              args: [
                                accountAddress as Address,
                                isDelegatedByMe ?
                                  (ZERO_ADDRESS as Address)
                                : (communityAddr as Address),
                              ],
                            })
                          }
                          isLoading={isDelegateProtopianLoading}
                          className="w-full"
                        >
                          {isDelegatedByMe ?
                            "Undelegate Protopian"
                          : "Delegate protopian"}
                        </Button>
                      )}
                      <RegisterMember
                        memberData={accountAddress ? isMemberResult : undefined}
                        registrationCost={totalRegistrationCost}
                        token={resolvedTokenGarden}
                        registryCommunity={registryCommunity}
                      />
                    </div>

                    <Divider className="mt-4" />

                    {/* Registration Stake Value */}
                    <div className="flex flex-col gap-2">
                      <div className="flex gap-1 items-center flex-wrap">
                        <p className="subtitle2">Registration stake:</p>
                        <InfoWrapper
                          tooltip={`Registration amount: ${parseToken(registrationAmount)} ${resolvedTokenGarden.symbol}\nCommunity fee: ${parseToken(parsedCommunityFee())} ${resolvedTokenGarden.symbol}`}
                        >
                          <div className="flex">
                            <EthAddress
                              address={resolvedTokenGarden.address as Address}
                              shortenAddress={true}
                              actions="none"
                              icon={false}
                              label={
                                <DisplayNumber
                                  number={[
                                    totalRegistrationCost,
                                    resolvedTokenGarden?.decimals,
                                  ]}
                                  valueClassName="text-md sm:text-lg font-bold"
                                  disableTooltip={true}
                                  compact={true}
                                  copiable={true}
                                  tokenSymbol={resolvedTokenGarden.symbol}
                                />
                              }
                            />
                          </div>
                        </InfoWrapper>
                      </div>
                      <CommunityStakingLeaderboard
                        membersStaked={leaderboardMembers}
                        tokenGarden={resolvedTokenGarden}
                        communityName={communityName ?? "Community"}
                        communityStakedTokens={communityStakedTokens}
                        communityAddress={registryCommunity.id as Address}
                        isCouncilSafe={isCouncilSafe}
                        isCouncilMember={isCouncilMember}
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>
              </header>

              {/* Stake component for mobile */}
              <div className="backdrop-blur-sm rounded-lg flex flex-col gap-2">
                <IncreasePower
                  memberData={accountAddress ? isMemberResult : undefined}
                  registryCommunity={registryCommunity}
                  tokenGarden={resolvedTokenGarden}
                  registrationAmount={registrationAmount}
                />
              </div>

              {!isProd && <TokenGardenFaucet token={resolvedTokenGarden} />}
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
    </>
  );
}

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
          data-testid="btn-select-all"
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
