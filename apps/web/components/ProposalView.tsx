import React from "react";
import { formatAddress } from "@/utils/formatAddress";
const ProposalView = ({
  id,
  title,
  type,
  description,
  status,
  requestedAmount,
  beneficiary,
  createdBy,
  points,
  supporters,
}: any) => {
  const sumSupportersAmount = () => {
    let sum = 0;
    supporters.forEach((supporter: any) => {
      sum += supporter.amount;
    });
    return sum;
  };

  const supportersTotalAmount = sumSupportersAmount();

  return (
    <div className="mx-auto flex min-h-screen max-w-7xl gap-3  px-4 sm:px-6 lg:px-8">
      <main className="flex flex-1 flex-col gap-6 rounded-xl border-2 border-black bg-base-100 p-16">
        {/* main content */}
        <span className="badge badge-secondary p-4">{type}</span>

        {/* title - description - status */}
        <div className="relative space-y-10 rounded-xl border-2 border-black bg-[#ffff] px-4 py-8">
          <div className=" flex items-baseline justify-end space-x-4 ">
            <h4 className="w-full text-center text-xl font-semibold">
              {title}
              <span className="badge badge-success absolute right-3 top-3">
                {status}
              </span>
            </h4>
          </div>
          <div className="">
            <p className="text-md text-start">{description}</p>
          </div>
          <div>
            {/* reqAmount - bene - creatBy */}
            <div className="flex justify-between">
              {requestedAmount && (
                <div className="flex flex-1 flex-col items-center">
                  <span className="text-md">Requested Amount</span>
                  <span className="text-md">{requestedAmount}</span>
                </div>
              )}
              <div className="flex flex-1 flex-col items-center">
                <span className="text-md">Beneficiary</span>
                <span className="text-md">{formatAddress(beneficiary)}</span>
              </div>
              <div className="flex flex-1 flex-col items-center">
                <span className="text-md">Created By</span>
                <span className="text-md">{formatAddress(createdBy)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* TODO!: this section */}
        <div className="flex h-64 items-center justify-center border-2">
          div for chart and stuff
        </div>
        {/* Support - Remove buttons */}
        <div className="mt-20 flex justify-evenly">
          <button className="btn btn-primary px-8">Support</button>
          <button className="btn btn-accent px-8">Dispute</button>
        </div>
      </main>

      {/* aside - supporters info address + amount */}
      <aside className="sapce-y-4 sticky top-3 flex h-fit w-96 flex-col rounded-xl border-2 border-black bg-base-100 px-[38px] py-6">
        <h4 className="border-b-2 border-dashed py-4 text-center text-xl font-semibold">
          Supporters
        </h4>
        <div className="mt-10 space-y-8">
          {supporters.map((supporter: any) => (
            <div className="flex justify-between" key={supporter.address}>
              <span>{formatAddress(supporter.address)}</span>
              <span>{supporter.amount}</span>
            </div>
          ))}
          <div className="flex justify-between py-6">
            <span>Total</span>
            <span>{supportersTotalAmount ?? ""}</span>
          </div>
        </div>
      </aside>
    </div>
  );
};

export default ProposalView;
