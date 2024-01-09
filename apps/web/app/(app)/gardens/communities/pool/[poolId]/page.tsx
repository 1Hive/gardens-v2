import { gardenLand } from "@/assets";
import { Proposals } from "@/components";
import Image from "next/image";

export default function Pool({
  params: { poolId },
}: {
  params: { poolId: string };
}) {
  return (
    <div className="mx-auto flex max-w-7xl gap-3 px-4 sm:px-6 lg:px-8">
      <div className="flex flex-1 flex-col gap-6 rounded-xl border-2 border-black bg-surface p-16">
        <header className="flex items-center justify-center border-4">
          <h2 className="text-center">
            <span className="font-press">Pool {poolId} - </span> Gardens Swarm
            Community Funding Pool
          </h2>
        </header>
        <main className="flex flex-col gap-10">
          {/* header: description - data - bottom land image */}
          <section className="relative flex w-full flex-col items-center overflow-hidden rounded-lg border-2 border-black bg-white">
            <div className="mt-4 flex flex-col gap-12 p-8">
              <p className="max-w-2xl  text-center text-lg font-semibold">
                Funding pool for the Gardens Platform. Dedicated to investing in
                operations, growth, and improvements of gardens, including
                maintenance and bug fixes to the open-source software, community
                outreach, support, contributor compensation, and education.
              </p>
              <div className="flex w-full p-4">
                <div className="flex flex-1 flex-col space-y-4 font-semibold">
                  <span>Strategy type: Conviction Voting</span>
                  <span>Funding Token: Honey</span>
                </div>
                <div className="flex flex-1 flex-col items-center space-y-4 font-bold">
                  <span>Proposals type accepted:</span>
                  <div className="flex w-full items-center justify-evenly">
                    <span className="badge w-28 bg-primary p-4">Funding</span>
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
          <Proposals />
        </main>
      </div>
    </div>
  );
}
