import { NavBar } from "@/components";
import { redirect } from "next/navigation";
import React from "react";

export default function Home() {
  redirect("/gardens");
  return (
    <>
      <NavBar />
      <main className="flex flex-col items-center justify-center space-y-8"></main>
    </>
  );
}
