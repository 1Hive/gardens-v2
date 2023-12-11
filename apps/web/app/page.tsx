import { NavBar } from "@/components";
import React from "react";
import { ThemeModeButton } from "@/components/ThemeButton";

export default function Home() {
  return (
    <>
      <NavBar />
      <main className="flex flex-col items-center justify-center space-y-8">
        <ThemeModeButton />
        <h1 className="font-press">Landing page</h1>
        <h3 className="font-chakra">Getting Started</h3>
      </main>
    </>
  );
}
