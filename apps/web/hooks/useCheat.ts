/* eslint-disable no-console */
import { useEffect } from "react";
import { useLocalStorage } from "usehooks-ts";

export const cheats = [
  "showArchived",
  "bypassSafeCheck",
  "allowNoProtection",
  "skipPublished",
  "queryAllChains",
];

type Cheat = (typeof cheats)[number];

export const useCheat = (cheat: Cheat) => {
  const [value] = useLocalStorage(cheat, "false");

  useEffect(() => {
    (window as any).cheats = () => {
      console.log("Cheats commands:");
      cheats.forEach((c) => {
        console.log(`localStorage.setItem("${c}", "true")`);
      });
    };
  }, []);

  return value === "true";
};

export const getCheat = (cheat: Cheat) => {
  return localStorage.getItem(cheat) === "true";
};
