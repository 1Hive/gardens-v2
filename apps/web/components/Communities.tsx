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
import { isProd } from "@/configs/isProd";
import {
  ONE_HIVE_COMMUNITY_ADDRESS,
  ONE_HIVE_FAKE_COMMUNITY_ADDRESS,
} from "@/globals";
import { useCheat } from "@/hooks/useCheat";

export type LightCommunity = Pick<RegistryCommunity, "id" | "communityName"> & {
  garden: Pick<TokenGarden, "address" | "chainId" | "symbol" | "name">;
  strategies?: Maybe<
    Array<Pick<CVStrategy, "id" | "totalEffectiveActivePoints" | "poolId">>
  >;
  members?: Maybe<Array<Pick<MemberCommunity, "id" | "memberAddress">>>;
  isProtopian: boolean;
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
  const [isExpanded, setIsExpanded] = useState<boolean>(defaultExpanded);

  const { isConnected } = useAccount();

  useEffect(() => {
    if (!isConnected) {
      setIsExpanded(true);
    }
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
            className="overflow-hidden mt-4"
          >
            <div className="flex flex-row flex-wrap gap-10">
              {isFetching ?
                Array(9)
                  .fill(0)
                  .map((_, i) => (
                    // eslint-disable-next-line react/no-array-index-key
                    <CommunityCardSkeleton key={`CommunityCardSkeleton-${i}`} />
                  ))
              : communities.map(({ id, ...communityProps }) => (
                  <CommunityCard key={id} id={id} {...communityProps} />
                ))
              }
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
  const queryAllChains = useCheat("queryAllChains");

  // Get unique token symbols and networks
  const availableTokens = Array.from(
    new Set(communities.map((c) => c.garden.symbol)),
  ).sort();

  useEffect(() => {
    // Filter communities based on search criteria
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

        // Filter out excluded communities from environment variable
        let isExcluded = false;
        if (
          !showExcludedCommunities &&
          process.env.NEXT_PUBLIC_EXCLUDED_COMMUNITIES
        ) {
          const excludedCommunities =
            process.env.NEXT_PUBLIC_EXCLUDED_COMMUNITIES.split(",").map((id) =>
              id.trim().toLowerCase(),
            );
          isExcluded = excludedCommunities.includes(community.id.toLowerCase());
        }

        return nameMatch && tokenMatch && networkMatch && !isExcluded;
      });
    };

    // Sort communities by length of members in descending order
    const sortedCommunities = [...communities].sort((a, b) => {
      // Show isProtopian communities on top and 1hive first
      const oneHiveEffectiveAddress =
        isProd || queryAllChains ?
          ONE_HIVE_COMMUNITY_ADDRESS
        : ONE_HIVE_FAKE_COMMUNITY_ADDRESS;

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

    const auxOtherCommunities: LightCommunity[] = [];
    const auxUserCommunities: LightCommunity[] = [];

    for (const community of sortedCommunities) {
      if (memberInCommunity(community)) {
        auxUserCommunities.push(community);
      } else {
        auxOtherCommunities.push(community);
      }
    }

    setUserCommunities(filterCommunities(auxUserCommunities));
    setOtherCommunities(filterCommunities(auxOtherCommunities));
  }, [address, communities, nameFilter, tokenFilter, chainIdFilter]);

  const memberInCommunity = (community: LightCommunity): boolean => {
    if (!community?.members) {
      return false;
    }
    return community.members.some(
      (member) =>
        member?.memberAddress?.toLowerCase() === address?.toLowerCase(),
    );
  };

  return (
    <section className="section-layout flex flex-col gap-2">
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
