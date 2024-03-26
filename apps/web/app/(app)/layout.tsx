import React from "react";
import { NavBar } from "@/components";
import { GoBackButton } from "@/components";
export default function layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <NavBar />
      {/* <GoBackButton /> */}
      <main className="mx-6 my-10">{children}</main>
      {/* footer */}
    </>
  );
}
