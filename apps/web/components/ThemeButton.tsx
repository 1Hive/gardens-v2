"use client";

import React from "react";
import { MoonIcon, SunIcon } from "@heroicons/react/24/outline";
import { useTheme } from "next-themes";
import { useIsMounted } from "@/hooks/useIsMounted";

export function ThemeButton() {
  const { resolvedTheme, setTheme } = useTheme();
  const isMounted = useIsMounted();

  if (!isMounted.current) {
    return <></>;
  }

  return (
    <button
      className="text-black"
      onClick={() =>
        setTheme(resolvedTheme === "lightTheme" ? "darkTheme" : "lightTheme")
      }
    >
      {resolvedTheme === "dark" ?
        <SunIcon className="h-5 w-5 text-red-400" aria-hidden="true" />
      : <MoonIcon className="h-5 w-5 text-red-400" aria-hidden="true" />}
    </button>
  );
}
