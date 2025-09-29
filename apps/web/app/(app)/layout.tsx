"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { newLogo } from "@/assets";
import { Button, ConnectWallet, ThemeButton } from "@/components";

export function HeadphoneIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="30"
      height="30"
      viewBox="0 0 256 256"
      fill="none"
      stroke="white"
      strokeWidth="4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <g transform="translate(1.4066 1.4066) scale(2.81 2.81)">
        <path d="M 41.046 86.144 c -3.486 0 -6.322 -2.837 -6.322 -6.322 S 37.56 73.5 41.046 73.5 c 3.487 0 6.323 2.837 6.323 6.322 S 44.532 86.144 41.046 86.144 z M 41.046 76.467 c -1.85 0 -3.355 1.505 -3.355 3.355 s 1.505 3.355 3.355 3.355 c 1.851 0 3.356 -1.505 3.356 -3.355 S 42.896 76.467 41.046 76.467 z" />
        <path d="M 80.581 33.518 C 77.501 16.67 62.724 3.856 45 3.856 c -17.724 0 -32.501 12.814 -35.581 29.662 C 4.103 34.283 0 38.855 0 44.379 v 11.321 c 0 5.038 3.413 9.285 8.045 10.575 c 0.048 0.092 0.105 0.182 0.174 0.265 c 7.408 8.931 16.898 13.801 28.252 14.542 v -2.971 c -9.529 -0.678 -17.627 -4.505 -24.15 -11.424 h 1.018 c 2.926 0 5.307 -2.381 5.307 -5.307 V 38.699 c 0 -2.926 -2.381 -5.306 -5.307 -5.306 h -0.877 C 15.548 18.252 28.961 6.823 45 6.823 c 16.039 0 29.452 11.43 32.539 26.57 h -0.878 c -2.925 0 -5.306 2.38 -5.306 5.306 v 22.681 c 0 2.926 2.381 5.307 5.306 5.307 h 2.352 C 85.071 66.688 90 61.759 90 55.701 V 44.379 C 90 38.855 85.897 34.283 80.581 33.518 z M 13.339 36.36 c 1.29 0 2.34 1.049 2.34 2.339 v 22.681 c 0 1.29 -1.049 2.34 -2.34 2.34 h -2.352 c -4.422 0 -8.02 -3.598 -8.02 -8.02 V 44.379 c 0 -4.422 3.598 -8.019 8.02 -8.019 H 13.339 z M 87.033 55.701 c 0 4.422 -3.598 8.02 -8.02 8.02 h -2.352 c -1.289 0 -2.339 -1.05 -2.339 -2.34 V 38.699 c 0 -1.29 1.05 -2.339 2.339 -2.339 h 2.352 c 4.423 0 8.02 3.597 8.02 8.019 V 55.701 z" />
      </g>
    </svg>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-primary relative">
      {/* Left Sidebar - Fixed with higher z-index */}
      {/* <aside className="hidden lg:flex fixed top-0 left-0 h-full w-[75px] bg-white border-r border-gray-200 flex-col items-center py-4 gap-4 z-50 justify-between">
        <Link href="/gardens" className="flex items-center gap-3 text-sm">
          <Image
            src={newLogo}
            alt="logo"
            height={40}
            width={40}
            loading="lazy"
          />
        </Link> */}
      {/* <div className="w-10 h-10 bg-tertiary-soft rounded-full flex items-center justify-center relative hover:border-2 hover:border-tertiary-content transition-colors duration-200 group cursor-pointer">
          <EllipsisHorizontalIcon className="w-6 h-6 text-black group-hover:text-tertiary-content transition-colors duration-200" />
        </div> */}
      {/* </aside> */}

      {/* Mobile Sidebar Overlay */}
      {/* {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40">
          <h5>s</h5>
        </div>
      )} */}

      {/* Mobile Sidebar */}
      {/* <aside
        className={`lg:hidden fixed top-0 left-0 h-full w-20 bg-white border-r border-gray-200 flex flex-col items-center py-6 gap-4 z-50 transform transition-transform duration-300 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center relative">
          <div className="absolute w-3 h-3 bg-green-500 rounded-full -top-1 -right-1 border-2 border-white" />
        </div>
        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center" />
        <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
          <span className="text-lg">🐝</span>
        </div>
      </aside> */}

      {/* Top Navigation Bar - Fixed with lower z-index */}
      <nav className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 lg:px-6 py-2 bg-neutral min-h-[71px] border-b border-border-neutral dark:border-border-neutral/50">
        <div className="flex items-center gap-2">
          <Link href="/gardens" className="flex items-center gap-3 text-sm">
            <Image
              src={newLogo}
              alt="logo"
              height={40}
              width={40}
              loading="lazy"
            />
            <h5>Gardens</h5>
          </Link>
          {/* Mobile Menu Button */}
          {/* <button
            className="lg:hidden btn btn-ghost"
            onClick={toggleMobileMenu}
          >
            {sidebarOpen ?
              <XMarkIcon className="w-5 h-5" />
            : <Bars3BottomLeftIcon className="w-5 h-5" />}
          </button> */}

          {/* <div className="flex items-center gap-2">
            <h4 className="">Gardens</h4>
          </div> */}
        </div>
        <div className="flex items-center gap-4">
          <ConnectWallet />
          <ThemeButton />
        </div>
      </nav>

      <div className="flex justify-center items-start pt-[71px] min-h-screen">
        <div className="w-full mx-auto">
          <div className="min-h-[400px]">
            {/* Main content */}
            {children}
          </div>
        </div>
      </div>

      {/* Bootom floating divs */}
      <div
        className="fixed bottom-4 left-4 tooltip tooltip-top-right tooltip-warning z-50 badge bg-secondary-soft dark:bg-secondary-soft-dark text-secondary-content cursor-pointer"
        data-tip="️️Disclaimer: our smart contracts have not undergone a third party security audit, use at your own risk."
      >
        Beta
      </div>
      <a
        href="https://discord.gg/6U8YGwVRWG"
        target="_blank"
        rel="noreferrer"
        className="fixed bottom-4 right-4 z-50"
      >
        <Button
          forceShowTooltip
          tooltip={"Discord\nSupport"}
          icon={<HeadphoneIcon />}
          className="!p-2"
        />
      </a>
    </div>
  );
}
