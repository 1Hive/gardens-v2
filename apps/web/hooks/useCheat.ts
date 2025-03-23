/* eslint-disable no-console */
import { useEffect } from "react";
import { useLocalStorage } from "usehooks-ts";

export const cheats = [
  "showArchived",
  "bypassSafeCheck",
  "allowNoProtection",
  "skipPublished",
  "queryAllChains",
] as const;

type Cheat = (typeof cheats)[number];

export const useCheat = (cheat: Cheat) => {
  const [value] = useLocalStorage(cheat, false, {
    deserializer: (v) => v === "true",
    serializer: (v) => (v ? "true" : "false"),
  });

  useEffect(() => {
    (window as any).cheats = () => {
      console.log("Cheats commands:");
      cheats.forEach((c) => {
        console.log(`localStorage.setItem("${c}", true)`);
      });
    };
  }, []);
  return value;
};

export const getCheat = (cheat: Cheat) => {
  return localStorage.getItem(cheat) === "true";
};
