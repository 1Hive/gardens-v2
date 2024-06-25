import React from "react";
import { NavBar } from "@/components";
import { GoBackButton } from "@/components";
export default function layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <NavBar />
      <GoBackButton />
      <main className="my-10 flex justify-center">{children}</main>
      {/* footer */}
    </>
  );
}
