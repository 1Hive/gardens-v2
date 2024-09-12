"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { Banner } from "@/assets";
import { GoBackButton, NavBar } from "@/components";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export default function Layout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div
      className="bg-fixed bg-cover min-h-screen"
      style={{
        backgroundImage:
          pathname === "/" ? `url('${Banner.src}')` : undefined,
      }}
    >
      <NavBar />
      <main className="mt-10 flex flex-col items-center">
        <nav className="w-full max-w-6xl">
          <div className="mx-8 flex gap-4 truncate">
            <GoBackButton />
            <Breadcrumbs />
          </div>
        </nav>
        {children}
      </main>
      {/* footer */}
    </div>
  );
}
