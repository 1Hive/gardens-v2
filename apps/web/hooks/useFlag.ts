import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useWatchLocalStorage } from "./useWatchLocalStorage";
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

// Cannot use dynamic key resolving since its resolve at build time
const getFlagFromEnv = (flag: CheatName) => {
  switch (flag) {
    case "showArchived":
      return process.env.NEXT_PUBLIC_FLAG_SHOWARCHIVED;
    case "bypassSafeCheck":
      return process.env.NEXT_PUBLIC_FLAG_BYPASSSAFECHECK;
    case "allowNoProtection":
      return process.env.NEXT_PUBLIC_FLAG_ALLOWNOPROTECTION;
    case "skipPublished":
      return process.env.NEXT_PUBLIC_FLAG_SKIPPUBLISHED;
    case "queryAllChains":
      return process.env.NEXT_PUBLIC_FLAG_QUERYALLCHAINS;
    case "showExcludedCommunities":
      return process.env.NEXT_PUBLIC_FLAG_SHOWEXCLUDEDCOMMUNITIES;
    case "showAsCouncilSafe":
      return process.env.NEXT_PUBLIC_FLAG_SHOWASCOUNCILSAFE;
    case "showUseSuperTokenBalance":
      return process.env.NEXT_PUBLIC_FLAG_SHOWUSESUPERTOKENBALANCE;
    default:
      return undefined;
  }
};

export const useFlag = (flag: CheatName) => {
  const queryParams = useSearchParams();

  const [flagFromStorage] = useWatchLocalStorage({
    key: "flag." + flag,
    deserializer: (v) => v === "true",
    serializer: (v) => (v ? "true" : "false"),
  });

  useEffect(() => {
    (window as any).useFlags = () => {
      console.info("Flags commands:");
      cheats.forEach((c) => {
        const enabled = localStorage.getItem("flag." + c) === "true";
        console.info(
          `localStorage.setItem("flag.${c}", ${!enabled})`,
          enabled ? "enabled" : "disabled",
        );
      });
    };
  }, []);

  const flagFromEnv = getFlagFromEnv(flag);
  const flagFromQuery = queryParams.get("flag_" + flag);
  if (flagFromQuery != null) {
    logOnce("debug", `🚩 [Flag:Query] ${flag} set to ${flagFromQuery}`);
    return flagFromQuery === "true";
  } else if (flagFromStorage != null) {
    logOnce("debug", `🚩 [Flag:storage] ${flag} set to ${flagFromStorage}`);
    return flagFromStorage;
  } else if (flagFromEnv != null) {
    logOnce("debug", `🚩 [Flag:Env] ${flag} set to ${flagFromEnv}`);
    return flagFromEnv === "true";
  }

  return false;
};
