"use client";

import React, { useEffect, useState } from "react";
import { ChevronUpIcon } from "@heroicons/react/24/outline";
import { useAccount } from "wagmi";
import { motion, AnimatePresence } from "motion/react";
import {
  CVStrategy,
  Maybe,
  MemberCommunity,
  RegistryCommunity,
  TokenGarden,
} from "#/subgraph/.graphclient";
import { CommunityCardV2 } from "./CommunityCardV2";

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

// Community section component to abstract the repeating pattern
const CommunitySection = ({
  title,
  communities,
  defaultExpanded = true,
}: {
  title: string;
  communities: LightCommunity[];
  defaultExpanded?: boolean;
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  if (communities.length === 0) return null;

  return (
    <div>
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
                <CommunityCardV2 key={id} id={id} {...communityProps} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export function CommunitiesV2({
  communities,
  header,
}: {
  communities: LightCommunity[];
  header?: React.ReactNode;
}) {
  const { address } = useAccount();
  const [otherCommunities, setOtherCommunities] = useState<LightCommunity[]>(
    [],
  );
  const [userCommunities, setUserCommunities] = useState<LightCommunity[]>([]);

  useEffect(() => {
    // Sort communities by length of members in descending order
    const sortedCommunities = [...communities].sort((a, b) => {
      if (a?.members && b?.members) {
        return b.members.length - a.members.length;
      } else {
        return 0;
      }
    });

    const auxOtherCommunities: LightCommunity[] = [];
    const auxUserCommunities: LightCommunity[] = [];

    for (let community of sortedCommunities) {
      if (memberInCommunity(community)) {
        auxUserCommunities.push(community);
      } else {
        auxOtherCommunities.push(community);
      }
    }

    setUserCommunities(auxUserCommunities);
    setOtherCommunities(auxOtherCommunities);
  }, [address, communities]);

  function memberInCommunity(community: LightCommunity) {
    if (!community?.members) {
      return false;
    }
    for (let member of community?.members ?? []) {
      if (member?.memberAddress?.toLowerCase() === address?.toLowerCase()) {
        return true;
      }
    }
    return false;
  }

  return (
    <section className="section-layout flex flex-col gap-2">
      {userCommunities.length > 0 && (
        <>
          <CommunitySection
            title="My communities"
            communities={userCommunities}
            defaultExpanded={true}
          />
          <div className="divider h-1 border-b border-secondary-content mx-2" />
        </>
      )}

      <CommunitySection
        title="Join a new community"
        communities={otherCommunities}
        defaultExpanded={true}
      />
    </section>
  );
}
