"use client";

import React from "react";
import { useState } from "react";
import {
  Bars3BottomLeftIcon,
  XMarkIcon,
  EllipsisHorizontalCircleIcon,
} from "@heroicons/react/24/outline";
import Image from "next/image";
import Link from "next/link";
import { newLogo } from "@/assets";
import { ConnectWallet } from "@/components";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleMobileMenu = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Left Sidebar - Fixed with higher z-index */}
      <aside className="hidden lg:flex fixed top-0 left-0 h-full w-[71px] bg-white border-r border-gray-200 flex-col items-center py-4 gap-4 z-50 justify-between">
        <Link href="/gardens" className="flex items-center gap-3 text-sm">
          <Image
            src={newLogo}
            alt="logo"
            height={40}
            width={40}
            loading="lazy"
          />
        </Link>
        <EllipsisHorizontalCircleIcon className="w-6 h-6 text-black hover:text-primary-button cursor-pointer" />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40">
          <h5>s</h5>
        </div>
      )}

      {/* Mobile Sidebar */}
      <aside
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
      </aside>

      {/* Top Navigation Bar - Fixed with lower z-index */}
      <nav className="fixed top-0 left-0 lg:left-20 right-0 z-40 flex items-center justify-between px-4 lg:px-6 py-2 border-b border-gray-200 bg-white min-h-[71px]">
        <div className="flex items-center gap-4">
          {/* Mobile Menu Button */}
          <button
            className="lg:hidden btn btn-ghost"
            onClick={toggleMobileMenu}
          >
            {sidebarOpen ?
              <XMarkIcon className="w-5 h-5" />
            : <Bars3BottomLeftIcon className="w-5 h-5" />}
          </button>

          {/* <div className="flex items-center gap-2">
            <h4 className="">Gardens</h4>
          </div> */}
        </div>
        <ConnectWallet />
      </nav>

      <div className="flex justify-center items-start pt-[71px] lg:ml-[71px] min-h-screen">
        <div className="max-w-7xl mx-auto">
          <div className="p-2 min-h-[400px] border-2 border-blue-600">
            {/* Main content */}
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
