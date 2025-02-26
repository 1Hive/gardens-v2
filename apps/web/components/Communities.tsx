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
import { CommunityCard } from "./CommunityCard";
import { CommunityFilters } from "./CommunityFilters";

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
}

interface CommunitiesProps {
  communities: LightCommunity[];
  header?: React.ReactNode;
}

const CommunitySection: React.FC<CommunitySectionProps> = ({
  title,
  communities,
  defaultExpanded = true,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(defaultExpanded);

  const { isConnected } = useAccount();

  useEffect(() => {
    if (!isConnected) {
      setIsExpanded(true);
    }
  }, [communities]);

  if (communities.length === 0) return null;

  return (
    <div>
      {isConnected && (
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
              {communities.map(({ id, ...communityProps }) => (
                <CommunityCard key={id} id={id} {...communityProps} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const Communities: React.FC<CommunitiesProps> = ({ communities }) => {
  const { address } = useAccount();
  const [otherCommunities, setOtherCommunities] = useState<LightCommunity[]>(
    [],
  );
  const [userCommunities, setUserCommunities] = useState<LightCommunity[]>([]);
  const [nameFilter, setNameFilter] = useState<string>("");
  const [tokenFilter, setTokenFilter] = useState<string>("");
  const [chainIdFilter, setchainIdFilter] = useState<string>("");

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
        return nameMatch && tokenMatch && networkMatch;
      });
    };

    // Sort communities by length of members in descending order
    const sortedCommunities = [...communities].sort((a, b) => {
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
          />
          <div className="divider h-1 border-b border-border-neutral mx-2" />
        </>
      )}

      <CommunitySection
        title="Join a new community"
        communities={otherCommunities}
        defaultExpanded={true}
      />
    </section>
  );
};
