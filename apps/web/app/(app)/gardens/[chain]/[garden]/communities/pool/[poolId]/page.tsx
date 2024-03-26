import { Badge, Proposals } from "@/components";
import { PoolStats } from "@/components";
import Image from "next/image";
import { cvStrategyABI, alloABI } from "@/src/generated";
import { createPublicClient, http } from "viem";
import { getChain } from "@/configs/chainServer";
import { gardenLand } from "@/assets";
import { initUrqlClient, queryByChain } from "@/providers/urql";
import {
  getAlloQuery,
  getPoolDataDocument,
  getPoolDataQuery,
} from "#/subgraph/.graphclient";
import { Address } from "#/subgraph/src/scripts/last-addr";
import { abiWithErrors } from "@/utils/abiWithErrors";
import { ProposalForm } from "@/components/Forms";

export const dynamic = "force-dynamic";

export type AlloQuery = getAlloQuery["allos"][number];

const { urqlClient } = initUrqlClient();

export default async function Pool({
  params: { chain, poolId, garden },
}: {
  params: { chain: string; poolId: number; garden: string };
}) {
  const client = createPublicClient({
    chain: getChain(chain),
    transport: http(),
  });

  const { data } = await queryByChain<getPoolDataQuery>(
    urqlClient,
    chain,
    getPoolDataDocument,
    { poolId: poolId, garden: garden },
  );
  const strategyObj = data?.cvstrategies?.[0];

  const pointSystem = data?.cvstrategies?.[0].config?.pointSystem;

  if (!strategyObj) {
    return <div>{`Pool ${poolId} not found`}</div>;
  }

  const strategyAddr = strategyObj.id as Address;
  const communityAddress = strategyObj.registryCommunity.id as Address;
  const alloInfo = data?.allos[0];
  const proposalType = strategyObj?.config?.proposalType as number;
  const poolAmount = strategyObj?.poolAmount as number;
  const tokenGarden = data.tokenGarden;

  return (
    <div className="relative mx-auto flex max-w-7xl gap-3 px-4 sm:px-6 lg:px-8">
      <div className="flex flex-1 flex-col gap-6 rounded-xl border-2 border-black bg-surface p-16">
        <header className="flex flex-col items-center justify-center">
          <h2 className="text-center font-press">Pool {poolId} </h2>
          <h4 className="text-2xl ">
            {/* {poolInfo[(poolId as unknown as number) - 1].title} */}
          </h4>
        </header>
        <main className="flex flex-col gap-10">
          {/* Description section */}

          <section className="relative flex w-full flex-col items-center overflow-hidden rounded-lg border-2 border-black bg-white">
            <div className="mt-4 flex w-full flex-col items-center gap-12 p-8">
              <h3 className="max-w-2xl  text-center font-semibold">
                Open Source Software Grants Pool
              </h3>
              <div className="flex w-full  p-4">
                <div className="flex flex-1  text-xl font-semibold">
                  <div className="mx-auto flex max-w-fit flex-col items-start justify-center">
                    <p className="text-md">
                      Strategy:{" "}
                      <span className="ml-2 text-xl"> Conviction Voting</span>
                    </p>
                    {proposalType == 1 && (
                      <p className="text-md">
                        Funding Token:{" "}
                        <span className="ml-2 text-xl">
                          {" "}
                          {tokenGarden?.symbol}
                        </span>
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex flex-1 flex-col items-center space-y-4 font-bold">
                  <p className="text-md">Proposals type accepted:</p>
                  <div className="flex w-full items-center justify-evenly">
                    <Badge type={proposalType} />
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-center"></div>
            </div>
            <div className=" flex">
              {[...Array(6)].map((_, i) => (
                <Image
                  key={i}
                  src={gardenLand}
                  alt="garden land"
                  className=""
                />
              ))}
            </div>
          </section>

          {/* Stats section */}
          <PoolStats
            balance={poolAmount}
            strategyAddress={strategyAddr}
            strategy={strategyObj}
            communityAddress={communityAddress}
            tokenGarden={tokenGarden}
            pointSystem={pointSystem}
          />

          {/* Proposals section */}
          <Proposals strategy={strategyObj} alloInfo={alloInfo} />
        </main>
        <ProposalForm
          poolId={poolId}
          proposalType={proposalType}
          alloInfo={alloInfo}
          tokenGarden={tokenGarden}
          tokenAddress={garden as Address}
        />
      </div>
    </div>
  );
}
