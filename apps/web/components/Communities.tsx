import React, { useEffect, useState } from "react";
import { ChevronUpIcon } from "@heroicons/react/24/outline";
import cn from "classnames";
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
import { useCheat } from "@/hooks/useCheat";

export type LightCommunity = Pick<RegistryCommunity, "id" | "communityName"> & {
  garden: Pick<TokenGarden, "address" | "chainId" | "symbol" | "name">;
  strategies?: Maybe<
    Array<
      Pick<
        CVStrategy,
        "id" | "totalEffectiveActivePoints" | "poolId" | "poolAmount"
      >
    >
  >;
  members?: Maybe<Array<Pick<MemberCommunity, "id" | "memberAddress">>>;
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
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
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
            className="flex items-center text-secondary-content gap-1"
            aria-label={isExpanded ? "Collapse" : "Expand"}
          >
            <h4 className="text-secondary-content">{title}</h4>
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
                      onMouseEnter={() => setHoveredIndex(index)}
                      onMouseLeave={() => setHoveredIndex(null)}
                    >
                      {/* <AnimatePresence>
                        {hoveredIndex === index && (
                          <motion.span
                            className="absolute inset-0 h-full w-full bg-secondary-soft block rounded-2xl z-10"
                            layoutId="hoverBackground"
                            initial={{ opacity: 0 }}
                            animate={{
                              opacity: 1,
                              transition: { duration: 0.15 },
                            }}
                            exit={{
                              opacity: 0,
                              transition: { duration: 0.15, delay: 0.2 },
                            }}
                          />
                        )}
                      </AnimatePresence> */}

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
  const [nameFilter, setNameFilter] = useState<string>("");
  const [tokenFilter, setTokenFilter] = useState<string>("");
  const [chainIdFilter, setchainIdFilter] = useState<string>("");
  const showExcludedCommunities = useCheat("showExcludedCommunities");

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
            .includes(nameFilter.toLowerCase()) ?? true;
        const tokenMatch =
          !tokenFilter || community.garden.symbol === tokenFilter;
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

    const sorted = [...communities].sort((a, b) => {
      if (a?.members && b?.members) return b.members.length - a.members.length;
      return 0;
    });

    const auxUser: LightCommunity[] = [];
    const auxOther: LightCommunity[] = [];

    for (const c of sorted) {
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
  }, [address, communities, nameFilter, tokenFilter, chainIdFilter]);

  return (
    <section className="flex flex-col gap-2">
      <CommunityFilters
        nameFilter={nameFilter}
        setNameFilter={setNameFilter}
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
          <div className="divider h-1 border-b border-border-neutral mx-2" />
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
