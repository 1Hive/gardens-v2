"use client";
import { GardensLogo } from "@/assets";
import Link from "next/link";
import React from "react";
import { navItems } from "@/constants/navigation";
import { Fragment } from "react";
import { Disclosure, Menu, Transition } from "@headlessui/react";
import { Bars3Icon, BellIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { Button } from ".";
import { useWeb3Modal } from "@web3modal/wagmi/react";
import { usePathname } from "next/navigation";
import { useAccount } from "wagmi";
import { formatAddress } from "@/utils/formatAddress";

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

export function NavBar() {
  const modal = useWeb3Modal();
  const account = useAccount();
  const { address } = account;
  const formattedAddress = formatAddress(address ?? "");

  //we use pathname to show current page on navigation items...
  const pathname = usePathname();

  return (
    <Disclosure as="nav" className="bg-surface shadow">
      {({ open }) => (
        <>
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 justify-between">
              <div className="flex gap-8">
                <div className="flex flex-shrink-0 items-center">
                  <Link href="/" className="flex items-center gap-3">
                    <GardensLogo className="h-10 text-primary" />
                    <span className="text-2xl font-medium">Gardens</span>
                  </Link>
                </div>
                <div className="hidden sm:ml-4 sm:flex sm:space-x-8">
                  {/* {navItems.map(({ name, href }) => (
                    <Link
                      key={href}
                      href={href}
                      className="inline-flex items-center border-b-2 border-transparent px-1 pt-1 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700"
                    >
                      {name}
                    </Link>
                  ))} */}
                </div>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:items-center">
                {/* <w3m-button balance="show" label="Connect Wallet" size="md" />{" "} */}
                <Button onClick={() => modal.open()} className="bg-primary">
                  {account.address ? formattedAddress : "Connect Wallet"}
                </Button>
              </div>
              <div className="-mr-2 flex items-center sm:hidden">
                {/* Mobile menu button */}
                <Disclosure.Button className="relative inline-flex items-center justify-center rounded-md bg-surface p-2 text-gray-400 hover:bg-surface hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500">
                  <span className="sr-only">Open main menu</span>
                  {open ? (
                    <XMarkIcon
                      className="block h-6 w-6 bg-surface"
                      aria-hidden="true"
                    />
                  ) : (
                    <Bars3Icon
                      className="block h-6 w-6 bg-surface"
                      aria-hidden="true"
                    />
                  )}
                </Disclosure.Button>
              </div>
            </div>
          </div>

          <Disclosure.Panel className="sm:hidden">
            <div className="space-y-1 pb-3 pt-2">
              {navItems.map(({ name, href }) => (
                <Link
                  key={href}
                  href={href}
                  className="block border-l-4 border-transparent py-2 pl-3 pr-4 text-base font-medium text-gray-500 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-700"
                >
                  {name}
                </Link>
              ))}
            </div>
            <div className="flex border-t border-gray-200 p-4">
              <Button onClick={() => modal.open()} className="bg-primary">
                Wallet
              </Button>
            </div>
          </Disclosure.Panel>
        </>
      )}
    </Disclosure>
  );
}
