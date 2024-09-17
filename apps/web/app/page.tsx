"use client";
import { JSX, SVGProps, useState } from "react";
import { Dialog } from "@headlessui/react";
import { CheckIcon } from "@heroicons/react/20/solid";
import {
  Bars3Icon,
  XMarkIcon,
  ArrowPathIcon,
  FingerPrintIcon,
  LockClosedIcon,
  Battery50Icon,
  ArrowTopRightOnSquareIcon,
  ArrowRightIcon,
} from "@heroicons/react/24/outline";
import Image from "next/image";
import { newLogo, commF, BrightIdLogo, PublicNounsLogo } from "@/assets";
import { Button } from "@/components";
import { ChainIcon } from "@/configs/chains";

export default function Page() {
  return (
    <>
      <Hero />
      <WhoIsFor />
      <OurStack />
      <ChainsDeploy />
      <Protopians />
      <SignUp />
      <Footer />
    </>
  );
}

//TODO: route app buttons to app.gardens ..

const Hero = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  return (
    <div className="bg-primary-soft">
      <header className="absolute inset-x-0 top-0 z-50">
        <Banner />

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
            ))} */}{" "}
            <a
              href="https://docs.gardens.fund"
              target="_blank"
              rel="noreferrer"
              className="text-primary-content subtitle2 flex items-center gap-1 hover:opacity-90"
            >
              Documentation
              <ArrowTopRightOnSquareIcon
                width={16}
                height={16}
                className="text-primary-content"
              />
            </a>
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
                <span className="sr-only">Gardens</span>
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
                  <a
                    href="https://docs.gardens.fund"
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary-content subtitle2 flex items-center gap-1 hover:opacity-90"
                  >
                    Documentation
                    <ArrowTopRightOnSquareIcon
                      width={16}
                      height={16}
                      className="text-primary-content"
                    />
                  </a>
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
              <p className="mt-2 text-lg leading-8">
                Our emphasis is on a community experience that’s{" "}
                <span className="text-lg font-bold text-primary-content">
                  healthy, fun, intuitive, secure, and open.
                </span>
              </p>
              <div className="mt-10 flex items-center gap-x-6">
                <a
                  href="/gardens"
                  className="flex items-center justify-center text-sm font-semibold leading-6 text-gray-900"
                  target="_blank"
                  rel="noreferrer"
                >
                  <Button>Launch App</Button>
                </a>
                <a
                  href="https://calendly.com/gardens-demo"
                  className="flex items-center justify-center text-sm font-semibold leading-6 text-gray-900"
                  target="_blank"
                  rel="noreferrer"
                >
                  {/* TODO: point to our url docs */}
                  <Button btnStyle="outline">Book Demo</Button>
                </a>
              </div>
            </div>

            <Image
              src={commF}
              alt={"ecosystem img"}
              className="mx-auto mt-10 aspect-[6/5] w-full max-w-lg rounded-2xl object-cover sm:mt-16 lg:mt-0 lg:max-w-none xl:row-span-2 xl:row-end-2 xl:mt-36"
            />
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-0 -z-10 h-24 bg-gradient-to-t from-white sm:h-32" />
      </div>
    </div>
  );
};

const Banner = () => {
  const [openBanner, setOpenBanner] = useState(true);

  return (
    <>
      {openBanner && (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 sm:flex sm:justify-center sm:px-6 sm:pb-5 lg:px-8">
          <div className="pointer-events-auto flex items-center justify-between gap-x-6 bg-primary-soft px-6 py-2.5 sm:rounded-xl sm:py-3 sm:pl-4 sm:pr-3.5">
            <p className="subtitle2">
              <a
                href="https://juicebox.money/v2/p/697?np=1&tabid=nft_rewards"
                target="_blank"
                rel="noreferrer"
              >
                <strong className="font-semibold">
                  Join our Seedling Funding Round on Juicebox
                </strong>
                <svg
                  viewBox="0 0 2 2"
                  aria-hidden="true"
                  className="mx-2 inline h-0.5 w-0.5 fill-current"
                >
                  <circle r={1} cx={1} cy={1} />
                </svg>
                Ends September 28 &nbsp;
                <span aria-hidden="true">&rarr;</span>
              </a>
            </p>
            <button
              type="button"
              className="-m-1.5 flex-none p-1.5"
              onClick={() => setOpenBanner(false)}
            >
              <span className="sr-only">Dismiss</span>
              <XMarkIcon aria-hidden="true" className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </>
  );
};

const whoIsFor = [
  {
    name: "Web3 token ecosystems",
    description:
      "Grow a diverse, healthy network of communities and public goods for your entire token economy.",
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
      "Participate in the communities you care about by supporting proposals or flagging abuse.",
  },
];

const WhoIsFor = () => {
  return (
    <div className="bg-white py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto grid max-w-2xl grid-cols-1 gap-x-8 gap-y-16 sm:gap-y-20 lg:mx-0 lg:max-w-none lg:grid-cols-3">
          <div>
            <h2 className="font-semibold leading-7">Who is Gardens for?</h2>
            <p className="mt-6 text-base leading-7 text-gray-600">
              Gardens is designed for organizations that create value beyond
              conventional private goods or services. It offers a better ROI on
              investments in shared resources and ecosystem growth compared to
              traditional governance structures.
            </p>
          </div>
          <div className="col-span-2 grid grid-cols-1 gap-x-8 gap-y-10 text-base leading-7 text-gray-600 sm:grid-cols-2 lg:gap-y-16">
            {whoIsFor.map((feature) => (
              <div key={feature.name} className="relative pl-9">
                <h3 className="font-chakra font-semibold text-gray-900">
                  <CheckIcon
                    aria-hidden="true"
                    className="absolute left-0 top-1 h-5 w-5 text-primary-content"
                  />
                  {feature.name}
                </h3>
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
      "A continuous voting system where your support gains strength over time. Encourages ongoing participation, favors consistent long-term members and ideas, and protects communities from short-term manipulation.",
    icon: Battery50Icon,
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
      "Infinitely composable multisigs integrated into Gardens community management and proposal dispute resolution.",
    icon: ArrowPathIcon,
  },
  {
    name: "Gitcoin Passport",
    description:
      "Web3’s leading tool for sybil resistance, enabling custom voting weight systems that help improve collective decision making.",
    icon: FingerPrintIcon,
  },
];

const OurStack = () => {
  return (
    <div className="bg-white py-20">
      <div className="mx-auto max-w-6xl px-6 lg:px-8 xl:px-0">
        <div className="max-w-2xl ">
          <p className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            A Curated Governance Toolkit
          </p>
          <p className="mt-6 text-lg leading-8">
            We build on web3’s best infrastructure to offer a secure,
            decentralized, and transparent platform.
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
                  <div className="flex min-h-[40px] items-center">
                    <h3>{feature.name}</h3>
                  </div>
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

const ChainsDeploy = () => {
  return (
    <div className="bg-neutral py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl lg:max-w-none">
          <h2 className="font-semibold leading-8">Available networks: </h2>
          <div className="mx-auto mt-10 grid grid-cols-2 items-center gap-x-8 gap-y-10 sm:gap-x-10 lg:mx-0 lg:grid-cols-4">
            <div className=" flex w-full flex-col items-center justify-start gap-4 object-contain object-left lg:col-span-1">
              <ChainIcon chain={100} height={48} />
              <h5 className="text-center">Gnosis</h5>
            </div>
            <div className="flec-col flex w-full flex-col items-center justify-start gap-4 object-contain object-left lg:col-span-1">
              <ChainIcon chain={10} height={48} />
              <h5 className="text-center"> Optimism</h5>
            </div>
            <div className="flec-col flex w-full flex-col items-center justify-start gap-4 object-contain object-left lg:col-span-1">
              <ChainIcon chain={42161} height={48} />
              <h5 className="text-center">Arbitrum</h5>
            </div>
            <div className="flec-col flex w-full flex-col items-center justify-start gap-4 object-contain object-left lg:col-span-1">
              <ChainIcon chain={137} height={48} />
              <h5 className="text-center">Polygon</h5>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const SignUp = () => {
  return (
    <div className="bg-white py-16 sm:py-16">
      <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
        <div className="isolate overflow-hidden bg-primary px-6 py-16 border1 sm:rounded-3xl sm:px-24 xl:py-24 relative">
          <h2 className="mx-auto max-w-2xl text-center text-3xl font-bold tracking-tight sm:text-4xl">
            Cultivate change with Gardens
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-center text-lg leading-8">
            Book a demo and start growing your community today.
          </p>
          <div className="mx-auto mt-10 flex max-w-md items-center justify-center gap-x-4 rounded-xl">
            <a
              href="https://calendly.com/gardens-demo"
              className="flex items-center justify-center text-sm font-semibold leading-6 text-gray-900"
              target="_blank"
              rel="noreferrer"
            >
              <Button>Book Demo</Button>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

const navigation = [
  {
    name: "X",
    href: "https://x.com/gardens_fund",
    icon: (props: JSX.IntrinsicAttributes & SVGProps<SVGSVGElement>) => (
      <svg fill="currentColor" viewBox="0 0 24 24" {...props}>
        <path d="M13.6823 10.6218L20.2391 3H18.6854L12.9921 9.61788L8.44486 3H3.2002L10.0765 13.0074L3.2002 21H4.75404L10.7663 14.0113L15.5685 21H20.8131L13.6819 10.6218H13.6823ZM11.5541 13.0956L10.8574 12.0991L5.31391 4.16971H7.70053L12.1742 10.5689L12.8709 11.5655L18.6861 19.8835H16.2995L11.5541 13.096V13.0956Z" />
      </svg>
    ),
  },
  {
    name: "GitHub",
    href: "https://github.com/1Hive/gardens-v2",
    icon: (props: JSX.IntrinsicAttributes & SVGProps<SVGSVGElement>) => (
      <svg fill="currentColor" viewBox="0 0 24 24" {...props}>
        <path
          fillRule="evenodd"
          d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
  {
    name: "Discord",
    href: "https://discord.gg/C4jhEYkqTv",
    icon: (props: JSX.IntrinsicAttributes & SVGProps<SVGSVGElement>) => (
      <svg fill="currentColor" viewBox="0 0 24 24" {...props}>
        <path
          fillRule="evenodd"
          d="M19.27 5.33C17.94 4.71 16.5 4.26 15 4a.09.09 0 0 0-.07.03c-.18.33-.39.76-.53 1.09a16.09 16.09 0 0 0-4.8 0c-.14-.34-.35-.76-.54-1.09-.01-.02-.04-.03-.07-.03-1.5.26-2.93.71-4.27 1.33-.01 0-.02.01-.03.02-2.72 4.07-3.47 8.03-3.1 11.95 0 .02.01.04.03.05 1.8 1.32 3.53 2.12 5.24 2.65.03.01.06 0 .07-.02.4-.55.76-1.13 1.07-1.74.02-.04 0-.08-.04-.09-.57-.22-1.11-.48-1.64-.78-.04-.02-.04-.08-.01-.11.11-.08.22-.17.33-.25.02-.02.05-.02.07-.01 3.44 1.57 7.15 1.57 10.55 0 .02-.01.05-.01.07.01.11.09.22.17.33.26.04.03.04.09-.01.11-.52.31-1.07.56-1.64.78-.04.01-.05.06-.04.09.32.61.68 1.19 1.07 1.74.03.02.06.03.09.01 1.72-.53 3.45-1.33 5.25-2.65.02-.01.03-.03.03-.05.44-4.53-.73-8.46-3.1-11.95-.01-.01-.02-.02-.04-.02zM8.52 14.91c-1.03 0-1.89-.95-1.89-2.12s.84-2.12 1.89-2.12c1.06 0 1.9.96 1.89 2.12 0 1.17-.84 2.12-1.89 2.12zm6.97 0c-1.03 0-1.89-.95-1.89-2.12s.84-2.12 1.89-2.12c1.06 0 1.9.96 1.89 2.12 0 1.17-.83 2.12-1.89 2.12z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
  {
    name: "Wrapcast",
    href: "https://warpcast.com/gardens",
    icon: (props: JSX.IntrinsicAttributes & SVGProps<SVGSVGElement>) => (
      <svg fill="currentColor" viewBox="0 0 24 24" {...props}>
        <path
          fillRule="evenodd"
          d="M3 4.5L7 20h2.5l3-12 3 12H18l4-15.5h-2.5L16 17 13 5h-2l-3 12-3.5-12.5H3z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
];

const Footer = () => {
  return (
    <footer className="bg-neutral">
      <div className="mx-auto max-w-7xl px-6 py-12 md:flex md:flex-col md:items-center md:justify-between lg:px-8 gap-8">
        <div className="flex justify-center space-x-6">
          {navigation.map((item) => (
            <a
              key={item.name}
              href={item.href}
              className="easy-in-out text-neutral-soft-content transition-colors duration-300 hover:text-primary-content"
              target="_blank"
              rel="noreferrer"
            >
              <span className="sr-only">{item.name}</span>
              <item.icon aria-hidden="true" className="h-6 w-6" />
            </a>
          ))}
        </div>
        <div className="mt-8 md:mt-0">
          <p className="text-center text-xs leading-5 text-gray-500">
            &copy; 2024 Gardens. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

const Protopians = () => {
  return (
    <div className="py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-x-8 gap-y-16 lg:grid-cols-2">
          <div className="mx-auto w-full max-w-xl lg:mx-0">
            <h2>Trusted by leading communities</h2>
            <p className="mt-6 ext-lg leading-8">
              Join the Protopians — early adopters who backed our Juicebox
              funding round and are shaping the future with us.
            </p>
            <div className="mt-8 flex items-center gap-x-6">
              <a
                href="https://juicebox.money/v2/p/697?np=1&tabid=nft_rewards"
                target="_blank"
                rel="noreferrer"
                className="text-primary-content subtitle2 flex items-center gap-1 hover:opacity-90"
              >
                Get NFT and become a Protopian
                <ArrowRightIcon
                  width={16}
                  height={16}
                  className="text-primary-content"
                />
              </a>
            </div>
          </div>
          <div className="mx-auto grid w-full max-w-xl grid-cols-2 items-center gap-y-12 sm:gap-y-14 lg:mx-0 lg:max-w-none lg:pl-8">
            <div className="flex flex-col items-center gap-1">
              <a
                href="https://www.brightid.org/"
                className="hover:scale-105 transition-all duration-200 ease-in-out"
                target="_blank"
                rel="noreferrer"
              >
                <Image
                  src={BrightIdLogo}
                  alt="logo"
                  height={66}
                  width={175}
                  loading="lazy"
                  className="max-h-[60px]"
                />
              </a>
              <p className="subtitle2">BrightID</p>
            </div>
            <div className="flex flex-col items-center gap-1">
              <a
                href="https://publicnouns.wtf/"
                className="hover:scale-105 transition-all duration-200 ease-in-out flex flex-col items-center"
                target="_blank"
                rel="noreferrer"
              >
                <Image
                  src={PublicNounsLogo}
                  alt="logo"
                  height={66}
                  width={175}
                  loading="lazy"
                />
              </a>
              <p className="subtitle2">Public Nouns</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
