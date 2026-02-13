import React, { useEffect, useState } from "react";
import { ChevronUpIcon } from "@heroicons/react/24/outline";
import { motion, AnimatePresence } from "motion/react";
import { useAccount } from "wagmi";
import {
  CVStrategy,
  Maybe,
  MemberCommunity,
  RegistryCommunity,
  TokenGarden,
} from "#/subgraph/.graphclient";
import { CommunityCard, CommunityCardSkeleton } from "./CommunityCard";
import { CommunityFilters } from "./CommunityFilters";
import { ONE_HIVE_COMMUNITY_ADDRESS } from "@/globals";
import { useFlag } from "@/hooks/useFlag";

export type LightCommunity = Pick<RegistryCommunity, "id" | "communityName"> & {
  garden: Pick<
    TokenGarden,
    "address" | "chainId" | "symbol" | "name" | "decimals"
  >;
  strategies?: Maybe<
    Array<Pick<CVStrategy, "id" | "totalEffectiveActivePoints" | "poolId">>
  >;
  members?: Maybe<
    Array<Pick<MemberCommunity, "id" | "memberAddress" | "stakedTokens">>
  >;
  isProtopian: boolean;
  membersCount: number;
};

interface CommunitySectionProps {
  title: string;
  communities: LightCommunity[];
  defaultExpanded?: boolean;
  skeletonLoading?: boolean;
  isFetching?: boolean;
}

interface CommunitiesProps {
  communities: LightCommunity[];
  header?: React.ReactNode;
  isFetching: boolean;
}

const CommunitySection: React.FC<CommunitySectionProps> = ({
  title,
  communities,
  defaultExpanded = true,
  skeletonLoading = false,
  isFetching,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  // const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const { isConnected } = useAccount();

  useEffect(() => {
    if (!isConnected) setIsExpanded(true);
  }, [communities]);

  if (!skeletonLoading && communities.length === 0) return null;

  return (
    <div>
      {isConnected && !isFetching && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center  gap-1"
            aria-label={isExpanded ? "Collapse" : "Expand"}
          >
            <h4 className="">{title}</h4>
            <motion.div
              animate={{ rotate: isExpanded ? 0 : 180 }}
              transition={{ duration: 0.3 }}
            >
              <ChevronUpIcon className="w-5 h-5" strokeWidth={3} />
            </motion.div>
          </button>
        </div>
      )}

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 py-10 relative">
              {(isFetching ? Array(9).fill(0) : communities).map(
                (communityOrIndex, index) => {
                  const key =
                    isFetching ?
                      `CommunityCardSkeleton-${index}`
                    : `CommunityCard-${(communityOrIndex as LightCommunity).id}`;

                  return (
                    <div
                      key={key}
                      className="relative group block h-full w-full"
                    >
                      <div className="relative z-20">
                        {isFetching ?
                          <CommunityCardSkeleton />
                        : <CommunityCard
                            key={(communityOrIndex as LightCommunity).id}
                            {...(communityOrIndex as LightCommunity)}
                          />
                        }
                      </div>
                    </div>
                  );
                },
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const Communities: React.FC<CommunitiesProps> = ({
  communities,
  isFetching,
}) => {
  const { address } = useAccount();
  const [otherCommunities, setOtherCommunities] = useState<LightCommunity[]>(
    [],
  );
  const [userCommunities, setUserCommunities] = useState<LightCommunity[]>([]);
  const [searchFilter, setSearchFilter] = useState<string>("");
  const [tokenFilter, setTokenFilter] = useState<string>("");
  const [chainIdFilter, setchainIdFilter] = useState<string>("");
  const showExcludedCommunities = useFlag("showExcludedCommunities");

  const availableTokens = Array.from(
    new Set(communities.map((c) => c.garden.symbol)),
  ).sort();

  useEffect(() => {
    const filterCommunities = (
      communityList: LightCommunity[],
    ): LightCommunity[] => {
      return communityList.filter((community) => {
        const nameMatch =
          community.communityName
            ?.toLowerCase()
            .includes(searchFilter.toLowerCase()) ?? true;
        const tokenMatch =
          !tokenFilter ||
          community.garden.symbol === tokenFilter ||
          searchFilter === community.garden.symbol ||
          searchFilter === community.garden.address;
        const networkMatch =
          !chainIdFilter ||
          community.garden.chainId.toString() === chainIdFilter;

        let isExcluded = false;
        if (
          !showExcludedCommunities &&
          process.env.NEXT_PUBLIC_EXCLUDED_COMMUNITIES
        ) {
          const excluded = process.env.NEXT_PUBLIC_EXCLUDED_COMMUNITIES.split(
            ",",
          ).map((id) => id.trim().toLowerCase());
          isExcluded = excluded.includes(community.id.toLowerCase());
        }

        return nameMatch && tokenMatch && networkMatch && !isExcluded;
      });
    };

    // Sort communities by length of members in descending order
    const sortedCommunities = [...communities].sort((a, b) => {
      // Show isProtopian communities on top and 1hive first
      const oneHiveEffectiveAddress = ONE_HIVE_COMMUNITY_ADDRESS;

      if (
        a.id.toLowerCase() === oneHiveEffectiveAddress &&
        b.id.toLowerCase() !== oneHiveEffectiveAddress
      )
        return -1;
      if (
        b.id.toLowerCase() === oneHiveEffectiveAddress &&
        a.id.toLowerCase() !== oneHiveEffectiveAddress
      )
        return 1;

      if (a.isProtopian && !b.isProtopian) return -1;
      if (!a.isProtopian && b.isProtopian) return 1;

      // Then sort by member count in descending order
      if (a?.members && b?.members) {
        return b.members.length - a.members.length;
      }
      return 0;
    });

    const auxUser: LightCommunity[] = [];
    const auxOther: LightCommunity[] = [];

    for (const c of sortedCommunities) {
      if (
        c?.members?.some(
          (m) => m.memberAddress?.toLowerCase() === address?.toLowerCase(),
        )
      ) {
        auxUser.push(c);
      } else {
        auxOther.push(c);
      }
    }

    setUserCommunities(filterCommunities(auxUser));
    setOtherCommunities(filterCommunities(auxOther));
  }, [address, communities, searchFilter, tokenFilter, chainIdFilter]);

  return (
    <section className="flex flex-col gap-2">
      <CommunityFilters
        searchFilter={searchFilter}
        setSearchFilter={setSearchFilter}
        tokenFilter={tokenFilter}
        setTokenFilter={setTokenFilter}
        chainIdFilter={chainIdFilter}
        setchainIdFilter={setchainIdFilter}
        availableTokens={availableTokens}
      />

      {userCommunities.length > 0 && (
        <>
          <CommunitySection
            title="My communities"
            communities={userCommunities}
            defaultExpanded={true}
            isFetching={isFetching}
          />
          <div className="divider h-1 border-b border-border-neutral dark:border-opacity-50 mx-2" />
        </>
      )}

      <CommunitySection
        title="Join a new community"
        communities={otherCommunities}
        defaultExpanded={true}
        isFetching={isFetching}
        skeletonLoading={true}
      />
    </section>
  );
};
