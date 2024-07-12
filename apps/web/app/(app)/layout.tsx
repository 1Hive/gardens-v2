import React from "react";
import { GoBackButton, NavBar } from "@/components";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export function layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <NavBar />
      <main className="my-10 flex flex-col items-center bg-primary">
        <nav className="w-full max-w-6xl">
          <div className="mx-8 flex gap-4 truncate">
            <GoBackButton />
            <Breadcrumbs />
          </div>
        </nav>
        {children}
      </main>
      {/* footer */}
    </>
  );
}
