"use client";

import React, { Fragment, useEffect, useRef, useState } from "react";

import {
  ChevronUpIcon,
  CircleStackIcon,
  CurrencyDollarIcon,
  PlusIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";

import { FetchTokenResult } from "@wagmi/core";
import cn from "classnames";

import { Dnum, multiply } from "dnum";
import { AnimatePresence, motion } from "motion/react";
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
import { useCheat } from "@/hooks/useCheat";
import { useContractWriteWithConfirmations } from "@/hooks/useContractWriteWithConfirmations";
import { useCouncil } from "@/hooks/useCouncil";
import { useDisableButtons } from "@/hooks/useDisableButtons";
import { useSubgraphQuery } from "@/hooks/useSubgraphQuery";
import { getProtopiansOwners } from "@/services/alchemy";
import { registryCommunityABI } from "@/src/generated";
import { Column, PoolTypes } from "@/types";
import { fetchIpfs } from "@/utils/ipfsUtils";
import {
  calculatePercentageBigInt,
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
  communityStakedTokens: number | bigint;
};

type MemberColumn = Column<MembersStaked>;

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
  const isFetchingNFT = useRef<boolean>(false);
  const { publish } = usePubSubContext();
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

  const getTotalRegistrationCost = () => {
    if (registerStakeAmount == undefined) {
      registerStakeAmount = 0;
    }

    const registerStakeAmountBn = BigInt(registerStakeAmount);
    const protocolFeeBn =
      protocolFee && BigInt(protocolFee * 100) / BigInt(SCALE_PRECISION);
    const communityFeeBn =
      communityFee && BigInt(communityFee * 100) / BigInt(SCALE_PRECISION);

    const res =
      registerStakeAmountBn + // Min stake
      (communityFee ?
        (registerStakeAmountBn * communityFeeBn) / 100n
      : BigInt(0)) + // Commuity fee as % of min stake
      (protocolFeeBn ?
        (registerStakeAmountBn * protocolFeeBn) / 100n
      : BigInt(0)); // Protocol fee as extra
    return res;
  };

  {
    /* Community Header */
  }

  return (
    <>
      <div className="col-span-12 xl:col-span-9">
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

              <div className="flex-1 flex-col lg:items-start lg:justify-between gap-2">
                {/* Community name + Address */}
                <div className="mb-3 ">
                  <h2>{communityName}</h2>
                  <EthAddress
                    icon={false}
                    address={communityAddr as Address}
                    label="Community address"
                    textColor="var(--color-grey-900)"
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
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
                  <div className="flex flex-col sm:flex-row gap-2 md:gap-6">
                    <Statistic
                      label="members"
                      count={members?.length ?? 0}
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
                        valueClassName="text-inherit"
                        symbolClassName="text-inherit"
                      />
                    </Statistic>
                  </div>
                  <div className="absolute top-12 md:top-7 right-5 flex items-center gap-2">
                    {(isCouncilMember || isCouncilSafe) && (
                      <Button
                        btnStyle="outline"
                        color="secondary"
                        disabled={isButtonDisabled || isCouncilMember}
                        tooltipSide="tooltip-bottom"
                        tooltip={
                          tooltipMessage ? tooltipMessage
                          : isCouncilMember ?
                            "Connect with Council Safe"
                          : "Archive this pool will hide it from being listed in the home page but will remain accessible through a link."

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
                      registrationCost={getTotalRegistrationCost()}
                      token={tokenGarden}
                      registryCommunity={registryCommunity}
                    />
                  </div>
                </div>

                {/* Registration Stake Value + View members Button*/}
                <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center mt-2">
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
                                getTotalRegistrationCost(),
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
                    onClick={() => setOpenCommDetails(!openCommDetails)}
                    btnStyle="link"
                    color="tertiary"
                    icon={
                      <ChevronUpIcon
                        className={`h-4 w-4 font-bold transition-transform duration-200 ease-in-out ${cn(
                          {
                            "rotate-180": !openCommDetails,
                          },
                        )} `}
                      />
                    }
                  >
                    {openCommDetails ? "Close" : "View"} Members
                  </Button>
                </div>
              </div>
            </div>

            {/* Community members stats */}
            {openCommDetails && (
              <CommunityDetailsTable
                membersStaked={registryCommunity.members as MembersStaked[]}
                tokenGarden={tokenGarden}
                communityStakedTokens={communityStakedTokens}
              />
            )}
          </header>

          {/* Pools Section */}
          <PoolSection title="Funding" pools={fundingPools} defaultExpanded />
          <PoolSection
            title="Signaling"
            pools={signalingPools}
            defaultExpanded
          />
          <PoolSection
            title="In Review"
            pools={poolsInReview}
            defaultExpanded={false}
          />
          {(!!isCouncilMember || isCouncilSafe || showArchived) && (
            <PoolSection
              title="Archived"
              pools={poolsArchived}
              defaultExpanded={false}
            />
          )}

          <section ref={covenantSectionRef} className="p-8">
            <h2 className="mb-4">Covenant</h2>
            {registryCommunity?.covenantIpfsHash ?
              <Skeleton isLoading={!covenant} rows={5}>
                <MarkdownWrapper source={covenant!} />
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

      {/* Right Sidebar - Stake component */}
      <div className="col-span-12 xl:col-span-3">
        <div className="backdrop-blur-sm rounded-lg flex flex-col gap-2 sticky top-32">
          <IncreasePower
            memberData={accountAddress ? isMemberResult : undefined}
            registryCommunity={registryCommunity}
            tokenGarden={tokenGarden}
            registrationAmount={registrationAmount}
          />
        </div>
      </div>
    </>
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
      title="Community Members"
      data={membersStaked as MembersStaked[]}
      description="Overview of all community members and the total amount of tokens they have staked."
      columns={columns}
      className="max-h-screen overflow-y-scroll w-full"
      footer={
        <div className="flex justify-between py-2">
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

//pool section component and types
type Pool = Pick<
  CVStrategy,
  "id" | "archived" | "isEnabled" | "poolId" | "metadata"
> & {
  proposals: Pick<CVProposal, "id">[];
  config: Pick<CVStrategyConfig, "proposalType" | "pointSystem">;
  token: any;
};
interface PoolSectionProps {
  title: string;
  pools: Pool[];
  defaultExpanded?: boolean;
}
const PoolSection = ({
  title,
  pools,
  defaultExpanded = true,
}: PoolSectionProps) => {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2"
        aria-label={expanded ? "Collapse" : "Expand"}
      >
        <h4>
          {title} ({pools.length})
        </h4>
        <motion.div
          animate={{ rotate: expanded ? 0 : 180 }}
          transition={{ duration: 0.3 }}
        >
          <ChevronUpIcon className="w-5 h-5" strokeWidth={3} />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="pool-layout">
              {pools.map((pool) => (
                <PoolCard key={pool.poolId} pool={pool} token={pool.token} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
