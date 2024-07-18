"use client";
import { JSX, SVGProps, useState } from "react";
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
import { newLogo, commF } from "@/assets";
import { ChainIcon } from "@/configs/chainServer";

export default function Page() {
  return (
    <>
      <Hero />
      <WhoIsFor />
      <OurStack />
      <ChainsDeploy />
      <SignUp />
      <Footer />
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
            {/* TODO: make it a link to garden form */}
            <a
              href="/"
              className="text-sm font-semibold leading-6 text-gray-900"
            >
              Sign up <span aria-hidden="true">&rarr;</span>
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
              src={commF}
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

const ChainsDeploy = () => {
  return (
    <div className="bg-neutral py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl lg:max-w-none">
          <h2 className="text-lg font-semibold leading-8">Soon available on</h2>
          <div className="mx-auto mt-10 grid grid-cols-4 items-center gap-x-8 gap-y-10 sm:grid-cols-6 sm:gap-x-10 lg:mx-0 lg:grid-cols-5">
            <div className="col-span-2 flex w-full flex-col items-center justify-start gap-4 object-contain object-left lg:col-span-1">
              <ChainIcon chain={100} height={48} />
              <h3 className="text-center">Gnosis</h3>
            </div>
            <div className="flec-col col-span-2 flex w-full flex-col items-center justify-start gap-4 object-contain object-left lg:col-span-1">
              <ChainIcon chain={10} height={48} />
              <h3 className="text-center"> Optimism</h3>
            </div>
            <div className="flec-col col-span-2 flex w-full flex-col items-center justify-start gap-4 object-contain object-left lg:col-span-1">
              <ChainIcon chain={42161} height={48} />
              <h3 className="text-center">Arbitrum</h3>
            </div>
            <div className="flec-col col-span-2 flex w-full flex-col items-center justify-start gap-4 object-contain object-left lg:col-span-1">
              <ChainIcon chain={1} height={48} />
              <h3 className="text-center">Polygon</h3>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const SignUp = () => {
  return (
    <div className="bg-white py-16 sm:py-24">
      <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
        <div className="relative isolate overflow-hidden bg-gray-900 px-6 py-24 shadow-2xl sm:rounded-3xl sm:px-24 xl:py-32">
          <h2 className="mx-auto max-w-2xl text-center text-3xl font-bold tracking-tight text-neutral sm:text-4xl">
            Get ready for our beta release
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-center text-lg leading-8 text-neutral-soft">
            aim to lunch in August 2024!
          </p>
          <div className="mx-auto mt-10 flex max-w-md items-center justify-center gap-x-4 border-2">
            {/* TODO: link to gardnes form */}
            <a
              href="/"
              className="w-full bg-neutral-inverted-content text-center text-sm font-semibold leading-6 hover:opacity-95"
            >
              Sign up <span aria-hidden="true">&rarr;</span>
            </a>
          </div>
          <svg
            viewBox="0 0 1024 1024"
            aria-hidden="true"
            className="absolute left-1/2 top-1/2 -z-10 h-[64rem] w-[64rem] -translate-x-1/2"
          >
            <circle
              r={512}
              cx={512}
              cy={512}
              fill="url(#759c1415-0410-454c-8f7c-9a820de03641)"
              fillOpacity="0.7"
            />
            <defs>
              <radialGradient
                r={1}
                cx={0}
                cy={0}
                id="759c1415-0410-454c-8f7c-9a820de03641"
                gradientUnits="userSpaceOnUse"
                gradientTransform="translate(512 512) rotate(90) scale(512)"
              >
                <stop stopColor="#65AD18" />
                <stop offset={1} stopColor="#2AAAE5" stopOpacity={0} />
              </radialGradient>
            </defs>
          </svg>
        </div>
      </div>
    </div>
  );
};

const navigation = [
  {
    name: "X",
    href: "#",
    icon: (props: JSX.IntrinsicAttributes & SVGProps<SVGSVGElement>) => (
      <svg fill="currentColor" viewBox="0 0 24 24" {...props}>
        <path d="M13.6823 10.6218L20.2391 3H18.6854L12.9921 9.61788L8.44486 3H3.2002L10.0765 13.0074L3.2002 21H4.75404L10.7663 14.0113L15.5685 21H20.8131L13.6819 10.6218H13.6823ZM11.5541 13.0956L10.8574 12.0991L5.31391 4.16971H7.70053L12.1742 10.5689L12.8709 11.5655L18.6861 19.8835H16.2995L11.5541 13.096V13.0956Z" />
      </svg>
    ),
  },
  {
    name: "GitHub",
    href: "#",
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
    href: "#",
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
    name: "Farecaster",
    href: "#",
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
      <div className="mx-auto max-w-7xl px-6 py-12 md:flex md:items-center md:justify-between lg:px-8">
        <div className="flex justify-center space-x-6 md:order-2">
          {navigation.map((item) => (
            <a
              key={item.name}
              href={item.href}
              className="easy-in-out text-neutral-soft-content transition-colors duration-300 hover:text-primary-content"
            >
              <span className="sr-only">{item.name}</span>
              <item.icon aria-hidden="true" className="h-6 w-6" />
            </a>
          ))}
        </div>
        <div className="mt-8 md:order-1 md:mt-0">
          <p className="text-center text-xs leading-5 text-gray-500">
            &copy; 2024 Gardens. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};
