"use client";

import { tree2, tree3, grassLarge } from "@/assets";
import Image from "next/image";
import { CommunityCard } from "@/components";
import {
  TokenGarden,
  getCommunitiesByGardenDocument,
  getCommunitiesByGardenQuery,
} from "#/subgraph/.graphclient";
import { FormLink } from "@/components";
import { useEffect, useMemo, useState } from "react";
import LoadingSpinner from "@/components/LoadingSpinner";
import useSubgraphQueryByChain from "@/hooks/useSubgraphQueryByChain";
import { isProd } from "@/constants/contracts";
import TokenGardenFaucet from "@/components/TokenGardenFaucet";

export const dynamic = "force-dynamic";

export default function Garden({
  params: { chain, garden },
}: {
  params: { chain: number; garden: string };
}) {
  const {
    data: result,
    error: getCommunitiesByGardenQueryError,
    fetching,
  } = useSubgraphQueryByChain<getCommunitiesByGardenQuery>(
    chain,
    getCommunitiesByGardenDocument,
    { addr: garden },
    {},
    [
      { topic: "member", chainId: chain },
      {
        topic: "community",

        chainId: chain,
      },
      {
        topic: "garden",
        id: garden,
        chainId: chain,
      },
    ],
  );

  useEffect(() => {
    if (getCommunitiesByGardenQueryError) {
      console.error(
        "Error while fetching communities: ",
        getCommunitiesByGardenQueryError,
      );
    }
  }, [getCommunitiesByGardenQueryError]);

  const [communities, setCommunities] = useState<
    | NonNullable<getCommunitiesByGardenQuery["tokenGarden"]>["communities"]
    | undefined
  >();

  const [tokenGarden, setTokenGarden] = useState<TokenGarden | undefined>();

  useEffect(() => {
    if (result) {
      let filteredCommunities = result.tokenGarden?.communities?.filter(
        (com) => com.isValid,
      );
      setCommunities(filteredCommunities ?? []);
      setTokenGarden(result.tokenGarden as TokenGarden);
      fetchAndUpdateCommunities(result.tokenGarden?.communities);
    }
  }, [result]);

  const fetchAndUpdateCommunities = async (communities: any) => {
    const promises =
      communities?.map(async (com: any) => {
        if (com?.covenantIpfsHash) {
          const ipfsHash = com.covenantIpfsHash;
          try {
            const response = await fetch("https://ipfs.io/ipfs/" + ipfsHash);
            const json = await response.json();
            // Return a new object with the updated covenantIpfsHash
            return { ...com, covenantData: json };
          } catch (error) {
            console.log(error);
            // Return the original community object in case of an error
            return com;
          }
        }
        // Return the original community object if there's no covenantIpfsHash
        return com;
      }) ?? [];

    // Wait for all promises to resolve and update the communities array
    const promisesResult = await Promise.all(promises);
    setCommunities(promisesResult);
  };

  const CommunityList = useMemo(() => {
    if (fetching) {
      return <LoadingSpinner />;
    } else if (communities?.length) {
      return communities.map((community, i) => (
        <CommunityCard
          {...community}
          tokenGarden={tokenGarden as TokenGarden}
          key={`${community.communityName}_${i}`}
        />
      ));
    } else {
      return <div className="text-center">No communities found</div>;
    }
  }, [communities?.length, fetching, tokenGarden]);

  return (
    <div className="bg-surface relative mx-auto max-w-6xl space-y-10 rounded-xl border-2 border-black bg-base-100 p-8">
      <header className="relative flex min-h-[500px] flex-col items-center justify-between gap-6 px-3">
        <div className="flex h-full min-h-96 flex-col items-center justify-between p-1">
          <h3 className="text-center font-press">
            {tokenGarden?.symbol} Token Ecosystem
          </h3>
          <p className="max-w-lg text-center font-semibold leading-7">
            Discover communities in the
            <span className="text-primary"> {tokenGarden?.name} Garden</span>,
            where you connect with people and support proposals bounded by a
            shared
            <span className="text-primary"> covenant.</span>
          </p>
          <FormLink
            label="Create Community"
            href={`/gardens/${chain}/${garden}/create-community`}
          />
        </div>
        <Image src={tree2} alt="tree" className="absolute bottom-0 left-5" />
        <Image src={tree3} alt="tree" className="absolute bottom-0 right-5" />
        <Image
          src={grassLarge}
          alt="grass"
          className="absolute -bottom-1 h-10 overflow-hidden"
        />
      </header>
      <section className="mx-auto flex flex-col gap-8">
        <h4 className="bg-surface rounded-b-xl py-6 text-center font-press shadow">
          {tokenGarden?.name} Communities
        </h4>
        {CommunityList}
      </section>
      {!isProd && tokenGarden && (
        <TokenGardenFaucet token={tokenGarden}></TokenGardenFaucet>
      )}
    </div>
  );
}
