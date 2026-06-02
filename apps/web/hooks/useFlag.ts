import { useEffect } from "react";
import { useWatchLocalStorage } from "./useWatchLocalStorage";
import { useCollectQueryParams } from "@/contexts/collectQueryParams.context";
import { logOnce } from "@/utils/log";

export const cheats = [
  "showArchived",
  "showStreamingPools",
  "showEscrow",
  "bypassSafeCheck",
  "allowNoProtection",
  "skipPublished",
  "queryAllChains",
  "showExcludedCommunities",
  "showAsCouncilSafe",
  "showEditCommunity",
  "showUseSuperTokenBalance",
  "loupe",
] as const;

export type CheatName = (typeof cheats)[number];

const getStorageKey = (flag: CheatName) => `flag_${flag}`;

const getGlobalFlagCommandName = (flag: CheatName, enabled: boolean) =>
  `flag_${flag}${enabled ? "Disable" : "Enable"}`;

const setFlagStorageValue = (flag: CheatName, enabled: boolean) => {
  const key = getStorageKey(flag);
  const newValue = enabled ? "true" : "false";
  window.localStorage.setItem(key, newValue);
  // Native storage events do not fire in the same tab, so dispatch one for immediate UI updates.
  window.dispatchEvent(new StorageEvent("storage", { key, newValue }));
};

const syncGlobalFlagCommands = () => {
  const windowWithFlagCommands = window as unknown as Record<string, unknown>;

  cheats.forEach((flag) => {
    const isEnabled = window.localStorage.getItem(getStorageKey(flag)) === "true";
    const enableCommandName = getGlobalFlagCommandName(flag, false);
    const disableCommandName = getGlobalFlagCommandName(flag, true);
    delete windowWithFlagCommands[enableCommandName];
    delete windowWithFlagCommands[disableCommandName];

    const commandName = getGlobalFlagCommandName(flag, isEnabled);
    windowWithFlagCommands[commandName] = () => {
      setFlagStorageValue(flag, !isEnabled);
      syncGlobalFlagCommands();
    };
  });
};

const setAllFlags = (enabled: boolean) => {
  cheats.forEach((flag) => {
    setFlagStorageValue(flag, enabled);
  });
  syncGlobalFlagCommands();
};

// Cannot use dynamic key resolving since its resolve at build time
const getFlagFromEnv = (flag: CheatName) => {
  switch (flag) {
    case "showArchived":
      return process.env.NEXT_PUBLIC_FLAG_SHOWARCHIVED;
    case "showStreamingPools":
      return process.env.NEXT_PUBLIC_FLAG_SHOWSTREAMINGPOOLS;
    case "showEscrow":
      return process.env.NEXT_PUBLIC_FLAG_SHOWESCROW;
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
    case "showEditCommunity":
      return process.env.NEXT_PUBLIC_FLAG_SHOWEDITCOMMUNITY;
    case "showUseSuperTokenBalance":
      return process.env.NEXT_PUBLIC_FLAG_SHOWUSESUPERTOKENBALANCE;
    case "loupe":
      return process.env.NEXT_PUBLIC_FLAG_LOUPE;
    default:
      return undefined;
  }
};

export const useFlag = (
  flag: CheatName,
  options?: {
    defaultValue?: boolean;
  },
) => {
  const queryParams = useCollectQueryParams();

  const [flagFromStorage] = useWatchLocalStorage({
    key: getStorageKey(flag),
    deserializer: (v) => v === "true",
    serializer: (v) => (v ? "true" : "false"),
  });

  const flagKey = getStorageKey(flag);

  useEffect(() => {
    if (!(window as any).useFlags) {
      (window as any).useFlags = (enabled?: boolean) => {
        if (typeof enabled === "boolean") {
          setAllFlags(enabled);
          console.info(`🚩 All flags set to ${enabled}`);
          return;
        }

        console.info("🚩Flags commands:");
        cheats.forEach((c) => {
          const isEnabled = localStorage.getItem(getStorageKey(c)) === "true";
          console.info(`window.${getGlobalFlagCommandName(c, isEnabled)}()`);
        });
        console.info('useFlags(true) // enable all');
        console.info('useFlags(false) // disable all');
      };

      syncGlobalFlagCommands();
    }
  }, []);

  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
  const flagFromEnv = getFlagFromEnv(flag) || undefined;
  const flagFromQuery = queryParams?.[flagKey] || undefined;
  if (flagFromQuery != null) {
    logOnce("debug", `🚩 [Query] ${flag} set to ${flagFromQuery}`);
    return flagFromQuery === "true";
  } else if (flagFromStorage != null) {
    logOnce("debug", `🚩 [storage] ${flag} set to ${flagFromStorage}`);
    return flagFromStorage;
  } else if (flagFromEnv != null) {
    logOnce("debug", `🚩 [EnvVar] ${flag} set to ${flagFromEnv}`);
    return flagFromEnv === "true";
  }

  return options?.defaultValue ?? false;
};
