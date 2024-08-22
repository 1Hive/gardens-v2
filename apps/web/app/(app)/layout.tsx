import React from "react";
import { Banner } from "@/assets";
import { GoBackButton, NavBar } from "@/components";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="bg-fixed bg-cover"
      style={{ backgroundImage: `url('${Banner.src}')` }}
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
