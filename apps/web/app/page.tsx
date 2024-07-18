"use client";
import { useState } from "react";
import { Dialog } from "@headlessui/react";
import { CheckIcon } from "@heroicons/react/20/solid";
import {
  Bars3Icon,
  XMarkIcon,
  ArrowPathIcon,
  CloudArrowUpIcon,
  FingerPrintIcon,
  LockClosedIcon,
} from "@heroicons/react/24/outline";
import Image from "next/image";
import { ecosystem, newLogo } from "@/assets";

export default function Page() {
  return (
    <>
      <Hero />
      <WhoIsFor />
      <OurStack />
    </>
  );
}

// const navigation = [
//   { name: "Product", href: "#" },
//   { name: "Features", href: "#" },
//   { name: "Marketplace", href: "#" },
//   { name: "Company", href: "#" },
// ];

const Hero = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  return (
    <div className="bg-primary-soft">
      <header className="absolute inset-x-0 top-0 z-50">
        <nav
          aria-label="Global"
          className="mx-auto flex max-w-7xl items-center justify-between p-6 lg:px-8"
        >
          <div className="flex lg:flex-1">
            <span className="sr-only">Gardens logo</span>
            <div className="-m-1.5 flex items-center gap-3 p-1.5">
              <Image
                src={newLogo}
                alt="logo"
                height={40}
                width={40}
                loading="lazy"
              />
              {/* <GardensLogo className="h-10 text-primary" /> */}
              <span className="text-2xl font-medium">Gardens</span>
            </div>
          </div>
          <div className="flex lg:hidden">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="-m-2.5 inline-flex items-center justify-center rounded-md p-2.5"
            >
              <span className="sr-only">Open main menu</span>
              <Bars3Icon aria-hidden="true" className="h-6 w-6" />
            </button>
          </div>
          <div className="hidden lg:flex lg:gap-x-12">
            {/* {navigation.map((item) => (
              <a
                key={item.name}
                href={item.href}
                className="text-sm font-semibold leading-6 text-gray-900"
              >
                {item.name}
              </a>
            ))} */}
          </div>
          <div className="hidden lg:flex lg:flex-1 lg:justify-end">
            <span className="text-sm font-semibold leading-6 text-gray-900">
              {/* TODO: make it a link to garden form */}
              Sign up <span aria-hidden="true">&rarr;</span>
            </span>
          </div>
        </nav>
        <Dialog
          open={mobileMenuOpen}
          onClose={setMobileMenuOpen}
          className="lg:hidden"
        >
          <div className="fixed inset-0 z-50" />
          <Dialog.Panel className="fixed inset-y-0 right-0 z-50 w-full overflow-y-auto bg-white px-6 py-6 sm:max-w-sm sm:ring-1 sm:ring-gray-900/10">
            <div className="flex items-center justify-between">
              <div className="-m-1.5 p-1.5">
                <span className="sr-only">Your Company</span>
                <Image
                  src={newLogo}
                  alt="logo"
                  height={40}
                  width={40}
                  loading="lazy"
                />
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="-m-2.5 rounded-md p-2.5 text-gray-700"
              >
                <span className="sr-only">Close menu</span>
                <XMarkIcon aria-hidden="true" className="h-6 w-6" />
              </button>
            </div>
            <div className="mt-6 flow-root">
              <div className="-my-6 divide-y divide-gray-500/10">
                <div className="space-y-2 py-6">
                  {/* {navigation.map((item) => (
                    <a
                      key={item.name}
                      href={item.href}
                      className="-mx-3 block rounded-lg px-3 py-2 text-base font-semibold leading-7 text-gray-900 hover:bg-gray-50"
                    >
                      {item.name}
                    </a>
                  ))} */}
                </div>
                <div className="py-6">
                  <span className="-mx-3 block rounded-lg px-3 py-2.5 text-base font-semibold leading-7 text-gray-900 hover:bg-gray-50">
                    Sign up
                  </span>
                </div>
              </div>
            </div>
          </Dialog.Panel>
        </Dialog>
      </header>
      <div className="relative isolate overflow-hidden bg-gradient-to-b from-indigo-100/20 pt-14">
        <div
          aria-hidden="true"
          className="absolute inset-y-0 right-1/2 -z-10 -mr-96 w-[200%] origin-top-right skew-x-[-30deg] bg-neutral shadow-xl shadow-indigo-600/10 ring-1 ring-neutral-inverted-content sm:-mr-80 lg:-mr-96"
        />
        <div className="mx-auto max-w-7xl px-6 py-32 sm:py-40 lg:px-8">
          <div className="mx-auto max-w-2xl lg:mx-0 lg:grid lg:max-w-none lg:grid-cols-2 lg:gap-x-16 lg:gap-y-6 xl:grid-cols-1 xl:grid-rows-1 xl:gap-x-8">
            <h1 className="tracking-tigh max-w-2xl text-4xl font-bold opacity-90 sm:text-6xl lg:col-span-2 xl:col-auto">
              Planting the seeds for the public economy
            </h1>
            <div className="mt-6 max-w-xl lg:-mt-2 xl:col-end-1 xl:row-start-1">
              <p className="text-lg leading-8">
                Gardens is a coordination platform giving communities
                streamlined access to web3’s best decision-sourcing mechanisms.
              </p>
              <p className="text-lg leading-8">
                Our emphasis is on a community experience that’s healthy, fun,
                intuitive, secure, and open.
              </p>
              {/* <div className="mt-10 flex items-center gap-x-6">
                <a
                  href="#"
                  className="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                >
                  Get started
                </a>
                <a
                  href="#"
                  className="text-sm font-semibold leading-6 text-gray-900"
                >
                  Learn more <span aria-hidden="true">→</span>
                </a>
              </div> */}
            </div>
            <Image
              src={ecosystem}
              alt={"ecosystem img"}
              className="mt-10 aspect-[6/5] w-full max-w-lg rounded-2xl object-cover sm:mt-16 lg:mt-0 lg:max-w-none xl:row-span-2 xl:row-end-2 xl:mt-36"
            />
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-0 -z-10 h-24 bg-gradient-to-t from-white sm:h-32" />
      </div>
    </div>
  );
};

const whoIsFor = [
  {
    name: "Web3 token ecosystems",
    description:
      "Grow a diverse, healthy network of communities and public goods for your entire tokenomics.",
  },
  {
    name: "Public goods organizations",
    description:
      "Coordinate a group of people to create value around a shared covenant.",
  },
  {
    name: "Open source software",
    description:
      "Reward contributors and source community decisions to help grow your project.",
  },
  {
    name: "Web3 communities and DAO's",
    description:
      "Harness collective intelligence to fund initiatives, make decisions and growth.",
  },
  {
    name: "Doers and Dreamers",
    description:
      "Participate in the communities you care about by supporting proposals or flagging abuse",
  },
];

const WhoIsFor = () => {
  return (
    <div className="bg-white py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto grid max-w-2xl grid-cols-1 gap-x-8 gap-y-16 sm:gap-y-20 lg:mx-0 lg:max-w-none lg:grid-cols-3">
          <div>
            <h2 className="text-base font-semibold leading-7 text-primary-content">
              Who is garden for ?
            </h2>
            <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Our all-in one hub
            </p>
            <p className="mt-6 text-base leading-7 text-gray-600">
              Gardens is a versatile platform designed to nurture and grow
              decentralized ecosystems. Our intuitive tools empower a wide range
              of organizations and individuals to harness the power of
              collective intelligence, from token-based economies to public
              goods initiatives.
            </p>
          </div>
          <div className="col-span-2 grid grid-cols-1 gap-x-8 gap-y-10 text-base leading-7 text-gray-600 sm:grid-cols-2 lg:gap-y-16">
            {whoIsFor.map((feature) => (
              <div key={feature.name} className="relative pl-9">
                <h5 className="font-chakra font-semibold text-gray-900">
                  <CheckIcon
                    aria-hidden="true"
                    className="absolute left-0 top-1 h-5 w-5 text-primary-content"
                  />
                  {feature.name}
                </h5>
                <p className="mt-2">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const ourStack = [
  {
    name: "Conviction voting",
    description:
      // TODO: ADD the best convicition voting description
      "Description here",
    icon: CloudArrowUpIcon,
  },
  {
    name: "Allo protocol",
    description:
      "Born from Gitcoin’s Grants Stack, a smart contract framework enabling novel funding mechanisms securely linked to funding pools.",
    icon: LockClosedIcon,
  },
  {
    name: "Gnosis Safe",
    description:
      " Infinitely composable multisigs integrated into Gardens community management and proposal dispute resolution",
    icon: ArrowPathIcon,
  },
  {
    name: "Gitcoin Passport",
    description:
      "Web3’s leading tool for sybil resistance, enabling the custom voting weight systems that help improve collective decision making.",
    icon: FingerPrintIcon,
  },
];

const OurStack = () => {
  return (
    <div className="bg-white py-20">
      <div className="mx-auto max-w-6xl px-4 lg:px-6">
        <div className="mx-auto max-w-2xl lg:text-center">
          <p className="mt-2 text-center text-3xl font-bold tracking-tight sm:text-4xl">
            Comprehensive DAO Toolkit
          </p>
          <p className="mt-6 text-center text-lg leading-8">
            {/* TODO: see if neccesary some minor description here */}
            Quis tellus eget adipiscing convallis sit sit eget aliquet quis.
            Suspendisse eget egestas a elementum pulvinar et feugiat blandit at.
            In mi viverra elit nunc.
          </p>
        </div>
        <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-6xl">
          <div className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-10 lg:max-w-none lg:grid-cols-2 lg:gap-y-16">
            {ourStack.map((feature) => (
              <div key={feature.name} className="relative rounded-xl pl-16">
                <div className="text-base font-semibold leading-7 text-gray-900">
                  <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-primary-content">
                    <feature.icon
                      aria-hidden="true"
                      className="h-6 w-6 text-white"
                    />
                  </div>
                  {feature.name}
                </div>
                <p className="mt-2 text-base leading-7 text-gray-600">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
