import React from "react";
import { NavBar } from "@/components";
import { GoBackButton } from "@/components";
export default function layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <GoBackButton />

      <NavBar />
      <main className="relative mx-auto mt-10 max-w-6xl rounded p-9">
        {children}
      </main>

      {/* footer */}
    </>
  );
}
