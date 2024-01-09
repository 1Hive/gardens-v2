import { gardenLand } from "@/assets";
import { Proposals } from "@/components";
import Image from "next/image";

//some metadata for each pool
const poolInfo = [
  {
    title: "Gardens Swarm Community Funding Pool",
    description:
      "Funding pool for the Gardens Platform. Dedicated to investing in operations, growth, and improvements of gardens, including maintenance and bug fixes to the open-source software, community outreach, support, contributor compensation, and education.",
  },
  {
    title: "1Hive Signaling  Pool",
    description:
      "Signaling pool for the 1hive Platform. Which most commonly used to signal support for a proposal or idea. The funds in this pool are not used for funding proposals, but rather to signal support for proposals in other pools.",
  },
];

export default function Pool({
  params: { poolId },
}: {
  params: { poolId: string };
}) {
  return (
    <div className="mx-auto flex max-w-7xl gap-3 px-4 sm:px-6 lg:px-8">
      <div className="flex flex-1 flex-col gap-6 rounded-xl border-2 border-black bg-surface p-16">
        <header className="flex flex-col items-center justify-center">
          <h2 className="text-center font-press">Pool {poolId} </h2>
          <h4 className="text-2xl ">
            {poolInfo[(poolId as unknown as number) - 1].title}
          </h4>
        </header>
        <main className="flex flex-col gap-10">
          {/* header: description - data - bottom land image */}
          <section className="relative flex w-full flex-col items-center overflow-hidden rounded-lg border-2 border-black bg-white">
            <div className="mt-4 flex flex-col gap-12 p-8">
              <p className="max-w-4xl text-center text-lg font-semibold">
                {poolInfo[(poolId as unknown as number) - 1].description}
              </p>
              <div className="flex w-full p-4">
                <div className="flex flex-1 flex-col space-y-4 text-xl font-semibold">
                  <span>Strategy type: Conviction Voting</span>
                  <span>Funding Token: Honey</span>
                </div>
                <div className="flex flex-1 flex-col items-center space-y-4 font-bold">
                  <span>Proposals type accepted:</span>
                  <div className="flex w-full items-center justify-evenly">
                    <span className="badge w-28 bg-primary p-4 tracking-wide">
                      Funding
                    </span>
                    <span className="badge w-28 bg-secondary p-4">
                      Streaming
                    </span>
                    <span className="badge w-28 bg-accent p-4">Signaling</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-8 flex">
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
          <Proposals poolId={poolId} />
        </main>
      </div>
    </div>
  );
}
