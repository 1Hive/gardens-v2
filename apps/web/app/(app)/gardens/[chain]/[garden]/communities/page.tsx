import { tree1, tree2, tree3, grass, grassLarge } from "@/assets";
import Image from "next/image";
import { CommunityCard } from "@/components";
import { getContractsAddrByChain } from "@/constants/contracts";
import {
  getCommunitiesByGardenDocument,
  getCommunitiesByGardenQuery,
} from "#/subgraph/.graphclient";
import { initUrqlClient, queryByChain } from "@/providers/urql";
import { CommunityForm } from "@/components/Forms";
import { Address } from "viem";

export const dynamic = "force-dynamic";

export default async function Garden({
  params: { chain, garden },
}: {
  params: { chain: number; garden: string };
}) {
  const { urqlClient } = initUrqlClient();

  const { data: result } = await queryByChain<getCommunitiesByGardenQuery>(
    urqlClient,
    chain,
    getCommunitiesByGardenDocument,
    { addr: garden },
  );

  console.log("result", result);

  // const result = await sdk.getCommunityByGarden({ addr: garden });
  const communities = result?.tokenGarden?.communities || [];
  const registryFactoryAddr = result?.registryFactories?.[0].id as Address;
  const tokenName = result?.tokenGarden?.name;
  const tokenSymbol = result?.tokenGarden?.symbol;
  const alloContractAddr = result?.tokenGarden?.communities?.[0]
    .alloAddress as Address;

  return (
    <div className="relative mx-auto max-w-5xl space-y-10 rounded-xl border-2 border-black bg-base-100 bg-surface p-8">
      <header className="relative flex min-h-[500px] flex-col items-center justify-between gap-6 px-3">
        <div className="flex h-full min-h-96 max-w-xl flex-col items-center justify-between p-1">
          <h3 className="text-center font-press">
            {tokenSymbol} Token Ecosystem
          </h3>
          <p className="max-w-lg text-center font-semibold leading-7">
            Discover communities in the
            <span className="text-primary"> Mock Token Garden</span>, where you
            connect with people and support proposals bounded by a shared
            <span className="text-primary"> covenant.</span>
          </p>

          {result && (
            <CommunityForm
              tokenGarden={result.tokenGarden}
              registryFactoryAddr={registryFactoryAddr}
              alloContractAddr={alloContractAddr}
            />
          )}
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
        <h4 className="sticky top-0  z-10 rounded-xl bg-surface py-6 text-center font-press shadow">
          {tokenName} Communities
        </h4>
        {/* communites */}
        {communities.map((community, i) => (
          <CommunityCard
            {...community}
            key={`${community.communityName}_${i}`}
          />
        ))}
      </section>
    </div>
  );
}
