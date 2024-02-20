import { honeyIcon } from "@/assets";
import Image from "next/image";
import { CommunityCard } from "@/components";
import { getContractsAddrByChain } from "@/constants/contracts";
import {
  getCommunityByGardenDocument,
  getCommunityByGardenQuery,
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

  const { data: result } = await queryByChain<getCommunityByGardenQuery>(
    urqlClient,
    chain,
    getCommunityByGardenDocument,
    { addr: garden },
  );

  // console.log("result", result);

  // const result = await sdk.getCommunityByGarden({ addr: garden });
  const communities = result?.tokenGarden?.communities || [];
  const registryFactoryAddr = result?.registryFactories?.[0].id as Address;
  const alloContractAddr = result?.tokenGarden?.communities?.[0]
    .alloAddress as Address;

  return (
    <div className="relative mx-auto max-w-5xl space-y-10 rounded-xl border-2 border-black bg-base-100 bg-surface p-8">
      {/* header: honey logo +stats */}
      <header className=" flex items-center justify-between gap-4 px-3 py-6">
        <div className="flex w-44 items-center justify-center gap-2">
          <Image src={honeyIcon} alt="honey icon" className="h-20 w-20" />
          <span className="text-2xl font-bold">
            {result?.tokenGarden?.symbol}
          </span>
        </div>
        {result && (
          <CommunityForm
            tokenGarden={result.tokenGarden}
            registryFactoryAddr={registryFactoryAddr}
            alloContractAddr={alloContractAddr}
          />
        )}
      </header>
      <section className="mx-auto flex flex-col gap-8">
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
