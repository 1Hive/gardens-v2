"use client";
import React from "react";
import { EthAddress } from "@/components";
import { Fragment, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import Image from "next/image";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { Button } from "@/components";
import { Address } from "viem";
import { tree1, tree4, grassBrown } from "@/assets";

type CommunityProfileProps = {
  communityAddress: Address;
  name: any;
};

export const CommunityProfile = ({ ...props }: CommunityProfileProps) => {
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
                  <Dialog.Panel className="pointer-events-auto relative max-w-2xl">
                    <Transition.Child
                      as={Fragment}
                      enter="ease-in-out duration-500"
                      enterFrom="opacity-0"
                      enterTo="opacity-100"
                      leave="ease-in-out duration-500"
                      leaveFrom="opacity-100"
                      leaveTo="opacity-0"
                    >
                      <div className="absolute right-1 top-1 z-10 flex ">
                        <button
                          type="button"
                          className="btn-square btn-sm p-1"
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
                            <div className="relative h-24 rounded-xl bg-surface sm:h-20 lg:h-28">
                              <div className=" flex">
                                {[...Array(6)].map((_, i) => (
                                  <Image
                                    key={i}
                                    src={grassBrown}
                                    alt="garden land"
                                    className="absolute bottom-0 left-0 w-full rounded-xl object-cover"
                                    fill={true}
                                    objectFit="cover"
                                  />
                                ))}
                              </div>
                            </div>
                            <div className="-mt-12 flow-root px-4 sm:-mt-8 sm:flex sm:items-end sm:px-6 lg:-mt-16">
                              <div>
                                <div className="-m-1 flex">
                                  <div className="inline-flex overflow-hidden rounded-lg border-4 border-white">
                                    <div className="border2 z-10 h-36 w-36 rounded-xl bg-slate-600">
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
                                    <EthAddress
                                      address={communityAddress}
                                      icon="identicon"
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
