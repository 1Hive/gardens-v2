import { gardenLand } from "@/assets";
import Image from "next/image";
export default function Gardens({
  params: { id },
}: {
  params: { id: string };
}) {
  return (
    <div className="mx-auto flex min-h-screen max-w-7xl gap-3  px-4 sm:px-6 lg:px-8">
      <main className="flex flex-1 flex-col gap-6 rounded-xl border-2 border-black bg-base-100 p-16">
        <h3 className="text-center">
          Pool {id} Gardens Swarm Community Funding Pool{" "}
        </h3>
        {/* header: description - data - bottom land image */}
        <header className="relative flex h-96 w-full flex-col items-center space-y-20 rounded-lg border-2 border-black bg-white p-8">
          <p className="max-w-3xl  text-center text-lg font-semibold">
            Funding pool for the Gardens Platform. Dedicated to investing in
            operations, growth, and improvements of gardens, including
            maintenance and bug fixes to the open-source software, community
            outreach, support, contributor compensation, and education.
          </p>
          <div className="flex w-full">
            <div className="flex flex-1 flex-col space-y-4 font-semibold">
              <span>Strategy type: Conviction Voting</span>
              <span>Funding Token: Honey</span>
            </div>
            <div className="flex flex-1 flex-col items-center space-y-4 font-bold">
              <span>Proposals type accepted:</span>
              <div className="flex w-full items-center justify-evenly">
                <span className="badge w-28 bg-primary p-4">Funding</span>
                <span className="badge w-28 bg-secondary p-4">Streaming</span>
                <span className="badge w-28 bg-accent p-4">Signaling</span>
              </div>
            </div>
          </div>
          <Image
            src={gardenLand}
            alt="garden land"
            className="absolute bottom-0 h-10 w-full"
          />
        </header>
        <div className="border-2 border-black bg-white p-16">
          {/* points */}
          <div></div>

          {/* proposals: title - proposals -create button */}
          <div className="mx-auto max-w-3xl space-y-10">
            <h3 className="mb-10 text-center">Proposals</h3>
            <div className="flex flex-col gap-14">
              {proposalsItems.map((proposal) => (
                <ProposalItem {...proposal} />
              ))}
            </div>
            <div className="flex justify-center">
              <button className="btn btn-primary">Create Proposal</button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

const proposalsItems = [
  {
    label: "Buy a billboard in Times Square",
    type: "Funding",
    bg: "bg-primary",
  },
  {
    label: "Zack active contributor",
    type: "Streaming",
    bg: "bg-secondary",
  },
  {
    label: "Current siganling proposal",
    type: "Signaling",
    bg: "bg-accent",
  },
];

const ProposalItem = ({
  label,
  type,
  bg,
}: {
  label: string;
  type: string;
  bg: string;
}) => {
  return (
    <div className="flex items-center justify-between font-semibold">
      <span>{label}</span>
      <span className={`badge w-28 p-4 ${bg}`}>{type}</span>
    </div>
  );
};
