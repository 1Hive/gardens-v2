"use client";

import {
  ThemeProvider as NextThemeProvider,
  useTheme as useNextTheme,
} from "next-themes";

export type GardensTheme = "lightTheme" | "darkTheme";
export type ThemeOption = GardensTheme | "system";

export const useTheme = () => {
  const theme = useNextTheme();
  const isDark = theme.resolvedTheme?.startsWith("dark");

  return {
    ...theme,
    theme: theme.theme as ThemeOption,
    resolvedTheme: (isDark ? "darkTheme" : "lightTheme") as GardensTheme,
    systemTheme:
      theme.systemTheme?.startsWith("dark") ?
        "darkTheme"
      : ("lightTheme" as GardensTheme),
    isDarkTheme: isDark,
    isSystemTheme: theme.theme === "system",
  };
};

const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <NextThemeProvider
      attribute="data-theme"
      defaultTheme="system"
      themes={["lightTheme", "darkTheme"]}
      enableSystem={true}
      value={{
        light: "lightTheme",
        lightTheme: "lightTheme",
        dark: "darkTheme",
        darkTheme: "darkTheme",
      }}
      disableTransitionOnChange={true}
    >
      {children}
    </NextThemeProvider>
  );
};

export default ThemeProvider;
