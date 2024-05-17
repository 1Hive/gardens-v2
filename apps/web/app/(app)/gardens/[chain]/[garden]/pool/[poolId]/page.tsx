import { Badge, Proposals, PoolMetrics } from "@/components";
import Image from "next/image";
import { gardenLand } from "@/assets";
import { initUrqlClient, queryByChain } from "@/providers/urql";
import {
  TokenGarden,
  getAlloQuery,
  getPoolDataDocument,
  getPoolDataQuery,
} from "#/subgraph/.graphclient";
import { Address } from "#/subgraph/src/scripts/last-addr";
import { getIpfsMetadata } from "@/utils/ipfsUtils";
import { pointSystems, proposalTypes } from "@/types";

export const dynamic = "force-dynamic";

export type AlloQuery = getAlloQuery["allos"][number];

const { urqlClient } = initUrqlClient();

export default async function Pool({
  params: { chain, poolId, garden },
}: {
  params: { chain: string; poolId: number; garden: string };
}) {
  const { data } = await queryByChain<getPoolDataQuery>(
    urqlClient,
    chain,
    getPoolDataDocument,
    { poolId: poolId, garden: garden },
  );
  const strategyObj = data?.cvstrategies?.[0];

  if (!strategyObj) {
    return <div>{`Pool ${poolId} not found`}</div>;
  }

  const pointSystem = data?.cvstrategies?.[0].config?.pointSystem;
  const strategyAddr = strategyObj.id as Address;
  const communityAddress = strategyObj.registryCommunity.id as Address;
  const alloInfo = data?.allos[0];
  const proposalType = strategyObj?.config?.proposalType as number;
  const poolAmount = strategyObj?.poolAmount as number;
  const tokenGarden = data.tokenGarden as TokenGarden;
  const metadata = data?.cvstrategies?.[0]?.metadata as string;
  const isEnabled = data?.cvstrategies?.[0]?.isEnabled as boolean;
  const { title, description } = await getIpfsMetadata(metadata);

  //TODO: check decimals
  //spending limit calculations
  const PRECISON_OF_7 = 10 ** 7;
  const maxRatioDivPrecision =
    Number(strategyObj?.config?.maxRatio) / PRECISON_OF_7;

  const spendingLimitPct = maxRatioDivPrecision * 100;

  return (
    <div className="relative mx-auto flex max-w-7xl gap-3 px-4 sm:px-6 lg:px-8">
      <div className="flex flex-1 flex-col gap-6 rounded-xl border-2 border-black bg-surface p-16">
        <header className="flex flex-col items-center justify-center">
          <h2 className="text-center font-press">Pool {poolId} </h2>
        </header>
        <main className="flex flex-col gap-10">
          {/* Description section */}
          <section className="relative flex w-full flex-col items-center overflow-hidden rounded-lg border-2 border-black bg-white">
            <div className="mt-4 flex w-full flex-col items-center gap-12 p-8">
              <h3 className="max-w-2xl  text-center font-semibold">{title}</h3>
              {!isEnabled && (
                <div className="badge badge-warning absolute left-5 top-5 gap-2 p-4 font-bold">
                  Pendign review from community council
                </div>
              )}

              <p>{description}</p>
              <div className="flex w-full  p-4">
                <div className="flex flex-1  text-xl font-semibold">
                  <div className="mx-auto flex max-w-fit flex-col items-start justify-center space-y-4">
                    <div className="text-md stat-title">
                      Strategy:{" "}
                      <span className="text-md pl-2 text-black">
                        {" "}
                        Conviction Voting
                      </span>
                    </div>
                    {proposalType == 1 && (
                      <div className="text-md stat-title">
                        Funding Token:{" "}
                        <span className="text-md pl-2 text-black">
                          {" "}
                          {tokenGarden?.symbol}
                        </span>
                      </div>
                    )}
                    <div className="text-md stat-title">
                      Points System:{" "}
                      <span className="text-md pl-2 text-black">
                        {pointSystems[pointSystem]}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-1 flex-col items-center space-y-2">
                  <p className="text-md stat-title text-xl font-semibold">
                    Proposals type accepted:
                  </p>
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
          {/* Pool metrics: for now we have funds available and spending limit */}
          {isEnabled && (
            <>
              {proposalTypes[proposalType] !== "signaling" && (
                <PoolMetrics
                  alloInfo={alloInfo}
                  poolId={poolId}
                  balance={poolAmount}
                  strategyAddress={strategyAddr}
                  strategy={strategyObj}
                  communityAddress={communityAddress}
                  tokenGarden={tokenGarden}
                  pointSystem={pointSystem}
                  spendingLimit={spendingLimitPct}
                />
              )}
              {/* Proposals section */}
              <Proposals
                strategy={strategyObj}
                alloInfo={alloInfo}
                communityAddress={communityAddress}
                createProposalUrl={`/gardens/${chain}/${garden}/pool/${poolId}/create-proposal`}
                proposalType={proposalType}
              />
            </>
          )}
        </main>
      </div>
    </div>
  );
}
