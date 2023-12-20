import React from "react";
import { NavBar } from "@/components";

export default function layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <NavBar />
      <main className="mx-6 my-10">{children}</main>
    </>
  );
}
