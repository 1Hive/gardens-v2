"use client";
import { ThemeProvider as NextThemeProvider } from "next-themes";

const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  return <NextThemeProvider attribute="class">{children}</NextThemeProvider>;
};

export default ThemeProvider;
