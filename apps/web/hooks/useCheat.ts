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
    initialValue: false,
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

  return value;
};

export const getCheat = (cheat: CheatName) => {
  return localStorage.getItem(cheat) === "true";
};
