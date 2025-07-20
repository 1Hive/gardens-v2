/* eslint-disable no-console */
import { useEffect } from "react";
import { useLocalStorage } from "usehooks-ts";

export const cheats = [
  "showArchived",
  "bypassSafeCheck",
  "allowNoProtection",
  "skipPublished",
  "queryAllChains",
  "showExcludedCommunities",
  "showAsCouncilSafe",
] as const;

export type CheatName = (typeof cheats)[number];

export const useCheat = (cheat: CheatName) => {
  const [value] = useLocalStorage(cheat, false, {
    deserializer: (v) => v === "true",
    serializer: (v) => (v ? "true" : "false"),
  });

  useEffect(() => {
    (window as any).useCheats = () => {
      console.log("Cheats commands:");
      cheats.forEach((c) => {
        console.log(
          `localStorage.setItem("${c}", true) => currently ${localStorage.getItem(c) === "true" ? "enabled" : "disabled"}`,
        );
      });
    };
  }, []);
  return value;
};

export const getCheat = (cheat: CheatName) => {
  return localStorage.getItem(cheat) === "true";
};
