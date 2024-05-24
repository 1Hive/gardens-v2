/* eslint-disable @next/next/no-img-element */
"use client";
import React, { useEffect } from "react";
import { EthAddress } from "@/components";
import { Fragment, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import Image from "next/image";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { Button } from "@/components";
import { Address } from "viem";
import { tree1, tree4, grassBrown } from "@/assets";

type ConvenantData = { logo: string; covenant: string } | undefined;

type CommunityProfileProps = {
  communityAddress: Address;
  name: string;
  covenantData: ConvenantData;
};

export const CommunityProfile = ({ ...props }: CommunityProfileProps) => {
  const { communityAddress, name, covenantData } = props;
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
            <div className="overflow-hidden">
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
                    <div className="relative h-full overflow-y-auto bg-white p-8">
                      <div className="relative min-w-[500px]">
                        {/* <div>
                          <div className="flex h-full">
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
                        </div> */}
                        <div className="flex gap-4">
                          <div className="border2 h-20 w-20 overflow-hidden rounded-full">
                            {/* logo image */}
                            {covenantData?.logo && covenantData?.logo !== "" ? (
                              <img
                                src={
                                  "https://ipfs.io/ipfs/" + covenantData?.logo
                                }
                                alt={`${name} community logo`}
                                className="h-full w-full rounded-full object-cover"
                              />
                            ) : (
                              <Image
                                src={tree1} // or any other image
                                alt={`${name} community logo`}
                                className="h-full w-full object-cover"
                              />
                            )}
                          </div>

                          {/* commuity name + Addrr */}
                          <div className="flex flex-col justify-between">
                            <h3 className="">{name}</h3>
                            <EthAddress
                              address={communityAddress}
                              icon="identicon"
                            />
                          </div>
                        </div>
                      </div>

                      {/* covenant */}
                      <div className="mt-8 w-full">
                        <h3 className="bg-white py-2">Covenant</h3>
                        <p className="text-justify leading-6">
                          {covenantData?.covenant
                            ? covenantData?.covenant
                            : "No covenent was submitted for this community."}
                        </p>
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
