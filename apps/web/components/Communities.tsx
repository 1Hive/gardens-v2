"use client";

import React, { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { CommunityCard } from "./CommunityCard";
import {
  CVStrategy,
  Maybe,
  MemberCommunity,
  RegistryCommunity,
} from "#/subgraph/.graphclient";

export type LightCommunity = Pick<RegistryCommunity, "id" | "communityName"> & {
  members?: Maybe<Array<Pick<MemberCommunity, "id" | "memberAddress">>>;
  strategies?: Maybe<Array<Pick<CVStrategy, "id">>>;
};

export function Communities({
  communities,
}: {
  communities: LightCommunity[];
}) {
  const { address } = useAccount();

  const [otherCommunities, setOtherCommunities] =
    useState<LightCommunity[]>(communities);
  const [userCommunities, setUserCommunities] = useState<LightCommunity[]>([]);

  useEffect(() => {
    const auxOtherCommunities: LightCommunity[] = [];
    const auxUserCommunities: LightCommunity[] = [];
    for (let community of communities) {
      if (memberInCommunity(community)) {
        auxUserCommunities.push(community);
      } else {
        auxOtherCommunities.push(community);
      }
    }
    setUserCommunities(auxUserCommunities);
    setOtherCommunities(auxOtherCommunities);
  }, [address]);

  function memberInCommunity(community: LightCommunity) {
    if (!community?.members) {
      return false;
    }
    for (let member of community?.members) {
      if (member?.memberAddress?.toLowerCase() === address?.toLowerCase()) {
        return true;
      }
    }
    return false;
  }

  return (
    <section className="section-layout flex flex-col gap-10">
      <header>
        <h2>Communities</h2>
      </header>
      {userCommunities.length > 0 && (
        <div>
          <h4 className="mb-4 text-secondary-content">My communities</h4>
          <div className=" flex flex-row flex-wrap gap-10">
            {userCommunities.map(
              ({ communityName, id, members, strategies }) => (
                <CommunityCard
                  key={id}
                  name={communityName ?? ""}
                  membersCount={members?.length ?? 0}
                  poolsCount={strategies?.length ?? 0}
                  id={id}
                />
              ),
            )}
          </div>
        </div>
      )}
      {otherCommunities.length > 0 && (
        <div>
          <h4 className="mb-4 text-secondary-content">Join a new community</h4>
          <div className=" flex flex-row flex-wrap gap-10">
            {otherCommunities.map(
              ({ communityName, id, members, strategies }) => (
                <CommunityCard
                  key={id}
                  name={communityName ?? ""}
                  membersCount={members?.length ?? 0}
                  poolsCount={strategies?.length ?? 0}
                  id={id}
                />
              ),
            )}
          </div>
        </div>
      )}
    </section>
  );
}
