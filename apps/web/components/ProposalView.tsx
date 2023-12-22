import React from "react";

const ProposalView = ({ id }: any) => {
  return (
    <div className="mx-auto flex h-screen max-w-7xl gap-3 border-4 px-4 sm:px-6 lg:px-8">
      <main className="flex h-full flex-1 flex-col gap-6 border border-black p-16">
        {/* main content */}

        <span className="badge badge-primary p-4 text-white">
          {"Proposal Type"}
        </span>

        {/* title - description - status */}
        <div className="border-2 border-black p-4">
          <div className="relative flex items-baseline justify-end space-x-4 ">
            <h4 className="w-full border text-center text-3xl font-bold">
              {"Proposal Title"}

              <span className="badge badge-outline absolute right-3 top-3">
                Status
              </span>
            </h4>
          </div>
          <div></div>
          <p className="text-xl">{"Proposal Description"}</p>
        </div>
      </main>
      <aside className="h-full w-96 border border-black p-4"></aside>
    </div>
  );
};

export default ProposalView;
