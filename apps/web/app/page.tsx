import { NavBar } from "@/components";
import React from "react";
import { ThemeModeButton } from "@/components/ThemeButton";

export default function Home() {
  return (
    <>
      <NavBar />
      <main className="flex justify-center">
        <ThemeModeButton />
        <h1>Landing page</h1>
      </main>
    </>
  );
}
