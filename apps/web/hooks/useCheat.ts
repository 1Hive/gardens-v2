/* eslint-disable no-console */
import { useEffect } from "react";
import { useWatchLocalStorage } from "./useWatchLocalStorage";

export const cheats = [
  "showArchived",
  "bypassSafeCheck",
  "allowNoProtection",
  "skipPublished",
  "queryAllChains",
  "showExcludedCommunities",
  "showAsCouncilSafe",
  "showUseSuperTokenBalance",
] as const;

export type CheatName = (typeof cheats)[number];

export const useCheat = (cheat: CheatName) => {
  const [value] = useWatchLocalStorage({
    key: cheat,
    initialValue:
      process.env[`NEXT_PUBLIC_CHEAT_${cheat.toUpperCase()}`] === "true",
    deserializer: (v) => v === "true",
    serializer: (v) => (v ? "true" : "false"),
  });

  useEffect(() => {
    (window as any).useCheats = () => {
      console.log("Cheats commands:");
      cheats.forEach((c) => {
        const enabled = localStorage.getItem(c) === "true";
        console.log(
          `localStorage.setItem("${c}", ${!enabled})`,
          enabled ? "enabled" : "disabled",
        );
      });
    };
  }, []);

  return value as boolean;
};

export const getCheat = (cheat: CheatName) => {
  console.log({
    storage: localStorage.getItem(cheat),
    envKey: `NEXT_PUBLIC_CHEAT_${cheat.toUpperCase()}`,
    env: process.env[`NEXT_PUBLIC_CHEAT_${cheat.toUpperCase()}`],
  });
  const value =
    localStorage.getItem(cheat) ??
    process.env[`NEXT_PUBLIC_CHEAT_${cheat.toUpperCase()}`];
  return value === "true";
};
