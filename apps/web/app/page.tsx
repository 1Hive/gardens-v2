import { NavBar } from "@/components";
import React from "react";
import { ThemeModeButton } from "@/components/ThemeButton";

export default function Home() {
  return (
    <>
      <NavBar />
      <main className="flex flex-col items-center justify-center  space-y-8 border-2">
        <h1 className="text-4xl font-bold">
          Welcome to Gardens v2 with daisyui
        </h1>
        <button className="btn btn-primary w-44">primary</button>
        <button className="btn btn-secondary w-44">secondary</button>
        <button className="btn btn-accent w-44">accent</button>
        <button className="btn btn-error w-44">error</button>
        <button className="btn btn-warning w-44">warning</button>
      </main>
    </>
  );
}
