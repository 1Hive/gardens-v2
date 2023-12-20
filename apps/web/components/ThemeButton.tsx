"use client";
import React from "react";
import { MoonOutline, SunOutline } from "heroicons-react";
import { useTheme } from "next-themes";
import { useIsMounted } from "@/hooks/useIsMounted";

export function ThemeButton() {
  const { resolvedTheme, setTheme } = useTheme();
  const isMounted = useIsMounted();

  if (!isMounted) {
    return null;
  }

  return (
    <button
      className="text-icon-light hover:text-iconHighlight-light dark:text-icon-dark hover:dark:text-iconHighlight-dark"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      {resolvedTheme === "dark" ? (
        <SunOutline className="h-5 w-5" aria-hidden="true" />
      ) : (
        <MoonOutline className="h-5 w-5" aria-hidden="true" />
      )}
    </button>
  );
}
