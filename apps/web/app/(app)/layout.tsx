import React from "react";
import { NavBar } from "@/components";
import { GoBackButton } from "@/components";
import { Breadcrumbs } from "@/components/Breadcrumbs";
export default function layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <NavBar />
      <main className="my-10 flex flex-col items-center bg-primary">
        <nav className="flex w-full max-w-6xl gap-2 overflow-hidden ">
          <GoBackButton />
          <div className="my-[2px] border-l-2 border-solid border-neutral-soft-content "></div>
          <Breadcrumbs />
        </nav>
        {children}
      </main>
      {/* footer */}
    </>
  );
}
