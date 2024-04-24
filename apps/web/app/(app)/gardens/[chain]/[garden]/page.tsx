import { tree2, tree3, grassLarge } from "@/assets";
import Image from "next/image";
import { CommunityCard, Identifier, FormLink, Layout } from "@/components";
import {
  RegistryCommunity,
  TokenGarden,
  getCommunitiesByGardenDocument,
  getCommunitiesByGardenQuery,
} from "#/subgraph/.graphclient";
import { initUrqlClient, queryByChain } from "@/providers/urql";
import { UserGroupIcon } from "@heroicons/react/24/outline";
import { newLogo } from "@/assets";

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
  const tokenAddress = result?.tokenGarden?.id;
  const communitiesCount = communities.length;

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
    <>
      <div className="relative flex flex-col gap-8">
        <Layout size="lg">
          <div className="flex items-center justify-between gap-10">
            <Image src={newLogo} height={280} width={311} alt="garden logo" />
            <div className="flex flex-1 flex-col gap-4">
              <div>
                <h2>{tokenGarden?.name} Garden</h2>
                <p>{tokenAddress}</p>
              </div>
              <p className="max-w-lg text-start">
                Discover communities in the {tokenGarden?.name} Garden , where
                you connect with people and support proposals bounded by a
                shared covenant
              </p>
              <Identifier
                icon={<UserGroupIcon />}
                label="Communities"
                count={communitiesCount}
              />
            </div>
          </div>
        </Layout>
        <Layout size="lg">
          <div className="flex flex-col gap-10">
            <h2>Communities</h2>

            <div className="">
              {communities.map((community, i) => (
                <CommunityCard
                  {...community}
                  tokenGarden={tokenGarden}
                  key={`${community.communityName}_${i}`}
                />
              ))}
            </div>
          </div>
        </Layout>
        <Layout>
          {" "}
          <h5 className="text-borderHover">Create Your Own Comminty</h5>
          <section className="relative flex flex-col items-center justify-center">
            <div className="flex h-full min-h-96 flex-col items-center justify-center p-1">
              <FormLink
                label="Create Community"
                href={`/gardens/${chain}/${garden}/create-community`}
              />
            </div>
            <Image
              src={tree2}
              alt="tree"
              className="absolute bottom-0 left-5"
            />
            <Image
              src={tree3}
              alt="tree"
              className="absolute bottom-0 right-5"
            />
            <Image
              src={grassLarge}
              alt="grass"
              className="absolute -bottom-1 h-10 overflow-hidden"
            />
          </section>{" "}
        </Layout>
      </div>
    </>
  );
}
