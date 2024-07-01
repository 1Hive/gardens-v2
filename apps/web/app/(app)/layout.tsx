import React from "react";
import { NavBar } from "@/components";
import { GoBackButton } from "@/components";
export default function layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <NavBar />
      <main className="my-10 flex flex-col items-center bg-primary">
        <div className="w-full max-w-6xl">
          <GoBackButton />
        </div>
        {children}
      </main>
      {/* footer */}
    </>
  );
}
