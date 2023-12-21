import { NavBar, ThemeButton } from "@/components";
import React from "react";

export default function Home() {
  return (
    <>
      <NavBar />
      <main className="flex flex-col items-center justify-center space-y-8">
        <h1 className="text-4xl font-bold">Landing page...</h1>
        <ThemeButton />
        <button className="btn btn-primary text-white">primary</button>
        <button className="btn btn-secondary w-44">secondary</button>
        <button className="btn btn-accent w-44">accent</button>
        <button className="btn btn-error w-44">error</button>
        <button className="btn btn-warning w-44">warning</button>
      </main>
    </>
  );
}
