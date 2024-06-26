import { tree2, tree3, grassLarge } from "@/assets";
import Image from "next/image";
import { CommunityCard } from "@/components";
import {
  RegistryCommunity,
  TokenGarden,
  getCommunitiesByGardenDocument,
  getCommunitiesByGardenQuery,
} from "#/subgraph/.graphclient";
import { initUrqlClient, queryByChain } from "@/providers/urql";
import { FormLink } from "@/components";

export const dynamic = "force-dynamic";

type Community = Pick<
  RegistryCommunity,
  | "id"
  | "covenantIpfsHash"
  | "chainId"
  | "communityName"
  | "registerToken"
  | "registerStakeAmount"
  | "alloAddress"
> & {};

export default async function Garden({
  params: { chain, garden },
}: {
  params: { chain: number; garden: string };
}) {
  const { urqlClient } = initUrqlClient();

  const { data: result, error: error } =
    await queryByChain<getCommunitiesByGardenQuery>(
      urqlClient,
      chain,
      getCommunitiesByGardenDocument,
      { addr: garden },
    );

  let communities = result?.tokenGarden?.communities || [];
  const tokenGarden = result?.tokenGarden as TokenGarden;

  const fetchAndUpdateCommunities = async (communities: any) => {
    const promises = communities.map(async (com: any) => {
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
    });

    // Wait for all promises to resolve and update the communities array
    const updatedCommunities = await Promise.all(promises);
    return updatedCommunities;
  };

  // Use the function
  await fetchAndUpdateCommunities(communities)
    .then((updatedCommunities) => {
      communities = updatedCommunities; // Here you'll have the communities array with updated covenantIpfsHashes
    })
    .catch((error) => {
      console.error("An error occurred:", error);
    });

  return (
    <div className="relative mx-auto max-w-6xl space-y-10 rounded-xl border-2 border-black bg-base-100 bg-surface p-8">
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
        <h4 className="rounded-b-xl bg-surface py-6 text-center font-press shadow">
          {tokenGarden?.name} Communities
        </h4>

        {/* communites */}
        {communities.map((community, i) => (
          <CommunityCard
            {...community}
            tokenGarden={tokenGarden}
            key={`${community.communityName}_${i}`}
          />
        ))}
      </section>
    </div>
  );
}
