"use client";
import React from "react";
import { Fragment, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { Button } from "@/components";
import { formatAddress } from "@/utils/formatAddress";
import { Addreth } from "addreth";

type CovenanSliderProps = {
  communityAddress: string;
  name: any;
};

export const CovenantSlider: React.FC<CovenanSliderProps> = ({ ...props }) => {
  const { communityAddress, name } = props;

  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)} variant="outline">
        Community Profile
      </Button>
      <Transition.Root show={open} as={Fragment}>
        <Dialog as="div" className="relative z-10" onClose={setOpen}>
          <Transition.Child
            as={Fragment}
            enter="ease-in-out duration-500"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in-out duration-500"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-gray-900 bg-opacity-75 transition-opacity" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-hidden">
            <div className="absolute inset-0 overflow-hidden">
              <div className="pointer-events-none fixed inset-y-0 left-0 flex max-w-full pr-10">
                <Transition.Child
                  as={Fragment}
                  enter="transform transition ease-in-out duration-500"
                  enterFrom="-translate-x-full"
                  enterTo="translate-x-0"
                  leave="transform transition ease-in-out duration-500"
                  leaveFrom="translate-x-0"
                  leaveTo="-translate-x-full"
                >
                  <Dialog.Panel className="pointer-events-auto relative w-[50vw] max-w-2xl">
                    <Transition.Child
                      as={Fragment}
                      enter="ease-in-out duration-500"
                      enterFrom="opacity-0"
                      enterTo="opacity-100"
                      leave="ease-in-out duration-500"
                      leaveFrom="opacity-100"
                      leaveTo="opacity-0"
                    >
                      <div className="absolute right-0 top-0 -mr-12 flex pl-2 pt-4 sm:-ml-10 sm:pr-4">
                        <button
                          type="button"
                          className="relative rounded-md text-gray-300 hover:text-white focus:outline-none focus:ring-2 focus:ring-white"
                          onClick={() => setOpen(false)}
                        >
                          <span className="absolute -inset-2.5" />
                          <span className="sr-only">Close panel</span>
                          <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                        </button>
                      </div>
                    </Transition.Child>
                    <div className="relative h-full w-full overflow-y-auto bg-white p-8">
                      <div className="space-y-6 pb-16">
                        <div className="divide-y divide-gray-200">
                          <div className="pb-6">
                            <div className="h-24 rounded-xl bg-surface sm:h-20 lg:h-28" />
                            <div className="-mt-12 flow-root px-4 sm:-mt-8 sm:flex sm:items-end sm:px-6 lg:-mt-16">
                              <div>
                                <div className="-m-1 flex">
                                  <div className="inline-flex overflow-hidden rounded-lg border-4 border-white">
                                    <div className="border2 h-36 w-36 rounded-xl">
                                      ipfs pic
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div className="mt-6 sm:ml-6 sm:flex-1">
                                <div>
                                  <div className="flex flex-col items-start">
                                    <h3 className="font-press text-xl text-info-content">
                                      {name}
                                    </h3>
                                    <Addreth
                                      address={
                                        communityAddress as `0x${string}`
                                      }
                                      explorer={(address) => ({
                                        name: "Base",
                                        url: `https://sepolia.arbiscan.io/address/${address}`,
                                        accountUrl: `https://sepolia.arbiscan.io/address/${address}`,
                                      })}
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="mt-10 w-full p-4">
                              <h3 className="bg-white py-2">Covenant</h3>
                              <p className="text-pretty leading-7">
                                Lullam, quam incidunt iusto libero modi nemo
                                aspernatur. Ullam libero consequuntur esse
                                dolores? In veritatis doloremque excepturi saepe
                                qui, dignissimos quia! Laudantium quam possimus
                                accusamus error, architecto eligendi placeat
                                sint blanditiis optio? Aliquam neque, beatae et
                                dolores necessitatibus sequi. Ipsam adipisci
                                nostrum suscipit porro.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Dialog.Panel>
                </Transition.Child>
              </div>
            </div>
          </div>
        </Dialog>
      </Transition.Root>
    </>
  );
};
