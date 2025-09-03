"use client";

import { ThemeProvider as NextThemeProvider } from "next-themes";

const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <NextThemeProvider
      attribute="data-theme"
      defaultTheme="lightTheme"
      themes={["lightTheme", "darkTheme"]}
      enableSystem={true}
    >
      {children}
    </NextThemeProvider>
  );
};

export default ThemeProvider;
