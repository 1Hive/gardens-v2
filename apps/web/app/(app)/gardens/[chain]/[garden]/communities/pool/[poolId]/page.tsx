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
  getBuiltGraphSDK,
  getSdk,
} from "#/subgraph/.graphclient";
import { DocumentInput } from "urql";
import { Address } from "#/subgraph/src/scripts/last-addr";

export const dynamic = "force-dynamic";

//some metadata for each pool
// @todo add this to IPFS to be fetched
// const poolInfo = [
//   {
//     title: "Arbitrum Grants Conviction Voting Pool",
//     description:
//       "This Funding Pool uses conviction voting to distribute funds for the best public goods providers on our network. Stake your support in your favorite proposals below - the longer you stake, the more conviction your support grows. if a proposal reaches enough conviction to pass, funds will be distributed.",
//   },
//   {
//     title: "1Hive Hackaton Signaling Pool",
//     description:
//       "Signaling pool for the 1hive Platform. Which most commonly used to signal support for a proposal or idea. The funds in this pool are not used for funding proposals, but rather to signal support for proposals in other pools.",
//   },
// ];

type PoolData = {
  profileId: `0x${string}`;
  strategy: `0x${string}`;
  token: `0x${string}`;
  metadata: { protocol: bigint; pointer: string };
  managerRole: `0x${string}`;
  adminRole: `0x${string}`;
};
type AlloQuery = getAlloQuery["allos"][number];

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

  const { data } = await queryByChain<getAlloQuery>(
    urqlClient,
    chain,
    getAlloDocument,
  );
  let alloInfo: AlloQuery | null = null;
  if (data && data.allos?.length > 0) {
    alloInfo = data.allos[0];
  }
  if (!alloInfo) {
    return <div>Allo not found</div>;
  }
  console.log("alloInfo", alloInfo);
  const addrs = getContractsAddrByChain(chain);
  if (!addrs) {
    return <div>Chain ID: {chain} not supported</div>;
  }

  const sdk = getBuiltGraphSDK();

  // const result = await sdk.getPool({ poolId: poolId });

  // const pool = result.cvstrategies.length > 0 ? result.cvstrategies[0] : null;

  // console.log(pool);

  const poolData = (await client.readContract({
    abi: alloABI,
    address: alloInfo.id as Address,
    functionName: "getPool",
    args: [BigInt(poolId)],
  })) as PoolData;

  console.log("poolData", poolData);
  if (poolData.strategy === "0x0000000000000000000000000000000000000000") {
    return <div>Pool not found</div>;
  }

  const poolBalance = await client.readContract({
    address: poolData.strategy,
    abi: cvStrategyABI,
    functionName: "getPoolAmount",
  });

  const POOL_BALANCE = Number(poolBalance);

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
                Description placeholder: ipsum dolor sit amet consectetur
                adipisicing elit. In corporis itaque placeat voluptatem
                consectetur temporibus autem commodi, unde accusantium magni
                error, laborum saepe! Ipsum, cum id dolor dolorum blanditiis
                ipsa!
              </p>
              <div className="flex w-full  p-4">
                <div className="flex flex-1 flex-col space-y-4 text-xl font-semibold">
                  <div className="flex flex-col items-center justify-center"></div>

                  <span>Strategy type: Conviction Voting</span>
                  <span>Funding Token: Honey</span>
                </div>
                <div className="flex flex-1 flex-col items-center space-y-4 font-bold">
                  <span>Proposals type accepted:</span>
                  <div className="flex w-full items-center justify-evenly">
                    <span className="badge w-28 bg-primary p-4 tracking-wide">
                      Funding
                    </span>
                    <span className="badge w-28 bg-secondary p-4 opacity-30">
                      Streaming
                    </span>
                    <span className="badge w-28 bg-accent p-4 opacity-40">
                      Signaling
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

          {/* <PoolStats
            balance={POOL_BALANCE}
            strategyAddress={poolData.strategy}
            poolId={poolId}
            communityAddress={addrs.registryCommunity}
          /> */}

          {/* Proposals section */}

          <Proposals
            poolId={poolId}
            strategyAddress={poolData.strategy}
            addrs={addrs}
          />
        </main>
      </div>
    </div>
  );
}
