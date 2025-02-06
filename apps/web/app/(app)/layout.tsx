"use client";

import React from "react";
import { GoBackButton } from "@/components/GoBackButton";
import { NavBar } from "@/components/NavBar";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-fixed bg-cover min-h-screen">
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
    </div>
  );
}
