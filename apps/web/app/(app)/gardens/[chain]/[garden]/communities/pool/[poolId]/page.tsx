import { Proposals } from "@/components";
import { PoolStats } from "@/components";
import Image from "next/image";
import { cvStrategyABI, alloABI } from "@/src/generated";
import { getContractsAddrByChain } from "@/constants/contracts";
import { createPublicClient, http } from "viem";
import { getChain } from "@/configs/chainServer";
import { gardenLand } from "@/assets";
import { initUrqlClient, queryByChain } from "@/providers/urql";
import {
  getAlloDocument,
  getAlloQuery,
  getPoolDataDocument,
  getPoolDataQuery,
  getStrategyByPoolDocument,
  getStrategyByPoolQuery,
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

  // const { data: alloData } = await queryByChain<getAlloQuery>(
  //   urqlClient,
  //   chain,
  //   getAlloDocument,
  // );
  // let alloInfo: AlloQuery | null = null;
  // if (alloData && alloData.allos?.length > 0) {
  //   alloInfo = alloData.allos[0];
  // }
  // if (!alloInfo) {
  //   return <div>Allo not found</div>;
  // }

  // console.log("alloInfo", alloInfo);

  // const { data: poolData } = await queryByChain<getStrategyByPoolQuery>(
  //   urqlClient,
  //   chain,
  //   getStrategyByPoolDocument,
  //   { poolId: poolId },
  // );

  // if (!poolData) {
  //   return <div>{`Pool ${poolId} not found`}</div>;
  // }

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

  const strategyAddr = strategyObj.id as Address;
  const communityAddress = strategyObj.registryCommunity.id as Address;
  const alloInfo = data?.allos[0];
  const proposalType = strategyObj?.config?.proposalType as number;
  const poolAmount = strategyObj?.poolAmount as number;
  const tokenGarden = data.tokenGarden;

  // if (!strategyObj.config) {
  //   return <div>Strategy Config not found</div>;
  // }

  // const poolBalance = await client.readContract({
  //   address: strategyAddr,
  //   abi: abiWithErrors(cvStrategyABI),
  //   functionName: "getPoolAmount",
  // });

  // const POOL_BALANCE = Number(poolBalance);

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
              <p className="max-w-2xl  text-center text-lg font-semibold">
                {/* {poolInfo[(poolId as unknown as number) - 1].description} */}
                {/* TODO:  fetch data ipfs */}
                Mocked data description
              </p>
              <div className="flex w-full  p-4">
                <div className="flex flex-1 flex-col space-y-4 text-xl font-semibold">
                  <div className="flex flex-col items-center justify-center"></div>

                  <span>Strategy: Conviction Voting</span>
                  <span>Funding Token: </span>
                </div>
                <div className="flex flex-1 flex-col items-center space-y-4 font-bold">
                  <span>Proposals type accepted:</span>
                  <div className="flex w-full items-center justify-evenly">
                    <span className="badge w-28 bg-primary p-4 tracking-wide">
                      Funding
                    </span>
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
          {proposalType == 1 ? (
            <PoolStats
              balance={poolAmount}
              strategyAddress={strategyAddr}
              strategy={strategyObj}
              communityAddress={communityAddress}
            />
          ) : (
            <div>Signaling Proposal type</div>
          )}
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
