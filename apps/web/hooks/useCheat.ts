/* eslint-disable no-console */
import { useEffect } from "react";
import { useWatchLocalStorage } from "./useWatchLocalStorage";
import { useCollectQueryParams } from "@/contexts/collectQueryParams.context";
import { logOnce } from "@/utils/log";

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

export const useConfig = (cheat: CheatName) => {
  const queryParams = useCollectQueryParams();

  const [value] = useWatchLocalStorage({
    key: cheat,
    initialValue: process.env[`NEXT_PUBLIC_${cheat.toUpperCase()}`] === "true",
    deserializer: (v) => v === "true",
    serializer: (v) => (v ? "true" : "false"),
  });

  if (!!process.env[`NEXT_PUBLIC_${cheat.toUpperCase()}`]) {
    logOnce(
      "debug",
      `${cheat} cheat set to ${process.env[`NEXT_PUBLIC_${cheat.toUpperCase()}`]} by env`,
    );
  }

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

  return (queryParams[cheat] ?? value) === "true";
};