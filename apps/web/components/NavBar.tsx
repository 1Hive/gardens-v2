"use client";

import React from "react";
import { ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";
import Image from "next/image";
import Link from "next/link";
import { newLogo } from "@/assets";
import { ConnectWallet } from "@/components";

export function NavBar() {
  return (
    <div className="sm:sticky top-0 z-20 max-w-7xl mx-auto lg:px-8 bg-primary">
      <div className="p-2 sm:py-3 sm:px-4 bg-neutral sm:rounded-2xl border1 sm:mt-3">
        <div className="flex justify-between">
          <div className="flex gap-8">
            <div className="flex flex-shrink-0 items-center gap-3 text-sm">
              <Link href="/gardens" className="flex items-center gap-3 text-sm">
                <Image
                  src={newLogo}
                  alt="logo"
                  height={40}
                  width={40}
                  loading="lazy"
                />
                <div className="flex flex-col">
                  <h4 className="">Gardens</h4>
                  <p className="italic text-primary-content text-sm">
                    pre-beta
                  </p>
                </div>
              </Link>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="sm:ml-6 flex sm:items-center gap-4">
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
            </div>
            <ConnectWallet />
          </div>
        </div>
      </div>
    </div>
  );
}
