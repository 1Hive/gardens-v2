"use client";

import React from "react";
import { Disclosure } from "@headlessui/react";
import {
  ArrowTopRightOnSquareIcon,
  Bars3Icon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import Image from "next/image";
import Link from "next/link";
import { newLogo } from "@/assets";
import { ConnectWallet } from "@/components/ConnectWalletButton";
import { navItems } from "@/constants/navigation";

export function NavBar() {
  return (
    <Disclosure
      as="nav"
      className="sticky top-0 z-20 max-w-7xl mx-auto lg:px-8 bg-primary pt-3"
    >
      {({ open }) => (
        <>
          <div className="p-2 sm:py-3 sm:px-4 bg-neutral rounded-2xl border1">
            <div className="flex justify-between">
              <div className="flex gap-8">
                <div className="flex flex-shrink-0 items-center gap-3 text-sm">
                  <Link
                    href="/gardens"
                    className="flex items-center gap-3 text-sm"
                  >
                    <Image
                      src={newLogo}
                      alt="logo"
                      height={40}
                      width={40}
                      loading="lazy"
                    />
                    <h4 className="">Gardens</h4>
                  </Link>
                  <p className="italic text-primary-content text-sm">
                    pre-beta release{" "}
                  </p>
                </div>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:items-center gap-4">
                <a
                  href="https://docs.gardens.fund"
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary-content subtitle2 flex items-center gap-1 hover:opacity-90"
                >
                  Docs
                  <ArrowTopRightOnSquareIcon
                    width={16}
                    height={16}
                    className="text-primary-content"
                  />
                </a>
                <ConnectWallet />
              </div>
              <div className="-mr-2 flex items-center sm:hidden">
                {/* Mobile menu button */}
                <Disclosure.Button className="bg-surface hover:bg-surface relative inline-flex items-center justify-center rounded-md p-2 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500">
                  <span className="sr-only">Open main menu</span>
                  {open ?
                    <XMarkIcon
                      className="bg-surface block h-6 w-6"
                      aria-hidden="true"
                    />
                  : <Bars3Icon
                      className="bg-surface block h-6 w-6"
                      aria-hidden="true"
                    />
                  }
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
          </Disclosure.Panel>
        </>
      )}
    </Disclosure>
  );
}
