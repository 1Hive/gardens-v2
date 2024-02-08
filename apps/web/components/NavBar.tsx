"use client";
import React from "react";
import { GardensLogo } from "@/assets";
import Link from "next/link";
import { navItems } from "@/constants/navigation";
import { Disclosure } from "@headlessui/react";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";
import { ConnectButton } from "@rainbow-me/rainbowkit";

export function NavBar() {
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
                <ConnectButton />
                {/* <w3m-button balance="show" label="Connect Wallet" size="md" />{" "} */}
                {/* <Button
                  disabled={connecting}
                  onClick={() => (wallet ? disconnect(wallet) : connect())}
                  className="bg-primary"
                >
                  {connecting
                    ? "Connecting"
                    : wallet
                      ? "Disconnect"
                      : "Connect"}
                </Button> */}
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
              {/* <ConnectButton /> */}
              {/* <Button
                disabled={connecting}
                onClick={() => (wallet ? disconnect(wallet) : connect())}
                className="bg-primary"
              >
                {connecting ? "Connecting" : wallet ? "Disconnect" : "Connect"}
              </Button> */}
            </div>
          </Disclosure.Panel>
        </>
      )}
    </Disclosure>
  );
}
