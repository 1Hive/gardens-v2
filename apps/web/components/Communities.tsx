"use client";
import React, { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { CommunityCard } from "./CommunityCard";
import { RegistryCommunity } from "#/subgraph/.graphclient";

export function Communities({
  communities,
}: {
  communities: RegistryCommunity[];
}) {
  const { address } = useAccount();

  const [otherCommunities, setOtherCommunities] =
    useState<RegistryCommunity[]>(communities);
  const [userCommunities, setUserCommunities] = useState<RegistryCommunity[]>(
    [],
  );

  useEffect(() => {
    const auxOtherCommunities: RegistryCommunity[] = [];
    const auxUserCommunities: RegistryCommunity[] = [];
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

  function memberInCommunity(community: RegistryCommunity) {
    if (!community?.members) {
      return false;
    }
    for (let member of community?.members) {
      if (member?.memberAddress?.toLowerCase() == address?.toLowerCase()) {
        return true;
      }
    }
    return false;
  }
  console.log(userCommunities, !!userCommunities);
  return (
    <section className="section-layout flex flex-col gap-10">
      <h2>Communities</h2>
      {userCommunities.length > 0 && (
        <div>
          <h4 className="mb-4 text-secondary-content">My communities</h4>
          <div className=" flex flex-row flex-wrap gap-10">
            {userCommunities.map(
              ({ communityName, id, members, strategies }) => (
                <CommunityCard
                  key={id}
                  name={communityName ?? ""}
                  members={members?.length ?? 0}
                  pools={strategies?.length ?? 0}
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
                  members={members?.length ?? 0}
                  pools={strategies?.length ?? 0}
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
