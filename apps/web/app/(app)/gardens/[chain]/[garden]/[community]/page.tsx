"use client";

import React, { Fragment, useEffect, useRef, useState } from "react";

import {
  CurrencyDollarIcon,
  PlusIcon,
  CircleStackIcon,
  UserGroupIcon,
  ChevronUpIcon,
} from "@heroicons/react/24/outline";

import { FetchTokenResult } from "@wagmi/core";
import cn from "classnames";

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
import { ONE_HIVE_COMMUNITY_ADDRESS } from "@/globals";
import { useChainFromPath } from "@/hooks/useChainFromPath";
import { useCheat } from "@/hooks/useCheat";
import { useDisableButtons } from "@/hooks/useDisableButtons";
import { useSubgraphQuery } from "@/hooks/useSubgraphQuery";
import { getProtopiansOwners } from "@/services/alchemy";
import { safeABI } from "@/src/generated";
import { PoolTypes, Column } from "@/types";
import { fetchIpfs } from "@/utils/ipfsUtils";
import {
  parseToken,
  SCALE_PRECISION,
  SCALE_PRECISION_DECIMALS,
  calculatePercentageBigInt,
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

  {
    /* Community Header */
  }

  return (
    <>
      <div className="col-span-12 lg:col-span-9">
        <div className="backdrop-blur-sm flex flex-col gap-10">
          <header className="bg-white border border-gray-200 shadow-sm section-layout">
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
                      />
                    </Statistic>
                  </div>
                  <div className="absolute top-12 md:top-7 right-5">
                    <RegisterMember
                      memberData={isMemberResult}
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
                              valueClassName="text-xl font-bold text-primary-content"
                              symbolClassName="text-primary-content"
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
                  <Button
                    onClick={() => setOpenCommDetails(!openCommDetails)}
                    btnStyle="outline"
                    color="disabled"
                    className="absolute top-0 right-0 md:flex items-start sm:w-auto border-none hover:opacity-75"
                    icon={
                      <ChevronUpIcon
                        className={`h-4 w-4 font-bold text-black transition-transform duration-200 ease-in-out ${cn(
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
          <section className="flex flex-col gap-10 py-4">
            <header className="flex  items-center justify-between ">
              <h2>Pools</h2>
              <Link
                href={`/gardens/${chain?.id}/${tokenAddr}/${communityAddr}/create-pool`}
              >
                <Button
                  btnStyle="filled"
                  disabled={!isConnected || missmatchUrl}
                  tooltip={tooltipMessage}
                  icon={<PlusIcon height={24} width={24} />}
                >
                  Create New Pool
                </Button>
              </Link>
            </header>
            <div className="flex flex-col gap-4 ">
              <h4 className="">Funding ({fundingPools.length})</h4>
              {/* Funding Pools */}
              <div className="pool-layout">
                {fundingPools.map((pool) => (
                  <Fragment key={pool.poolId}>
                    <PoolCard token={pool.token} pool={pool} />
                  </Fragment>
                ))}
              </div>
            </div>
            {/* Signaling Pools */}
            <div className="flex flex-col gap-4">
              <h4>Signaling ({signalingPools.length})</h4>
              <div className="pool-layout">
                {signalingPools.map((pool) => (
                  <PoolCard key={pool.poolId} token={pool.token} pool={pool} />
                ))}
              </div>
            </div>
            {/* Pools in Review */}
            <div className="flex flex-col gap-4">
              <h4>In Review ({poolsInReview.length})</h4>
              <div className="pool-layout">
                {poolsInReview.map((pool) => (
                  <PoolCard key={pool.poolId} token={pool.token} pool={pool} />
                ))}
              </div>
            </div>

            {(!!isCouncilMember ||
              accountAddress?.toLowerCase() ===
                registryCommunity.councilSafe?.toLowerCase() ||
              showArchived) && (
              <div className="flex flex-col gap-4">
                <h4>Archived ({poolsArchived.length})</h4>
                {/* Archived Pools */}
                <div className="pool-layout">
                  {poolsArchived.map((pool) => (
                    <PoolCard
                      key={pool.poolId}
                      token={pool.token}
                      pool={pool}
                    />
                  ))}
                </div>
              </div>
            )}
          </section>

          <section ref={covenantSectionRef} className="p-8">
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
      </div>

      {/* Right Sidebar - Stake component */}
      <div className="col-span-12 lg:col-span-3">
        <div className="backdrop-blur-sm rounded-lg flex flex-col gap-2 sticky top-32">
          <IncreasePower
            memberData={isMemberResult}
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
