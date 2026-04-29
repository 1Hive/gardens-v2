"use client";

import {
  DEFAULT_EXPLORER_PREFERENCE,
  EXPLORER_PREFERENCE_STORAGE_KEY,
  ExplorerPreference,
  isExplorerPreference,
} from "@/configs/chains";
import { useWatchLocalStorage } from "@/hooks/useWatchLocalStorage";

export function useExplorerPreference() {
  const [explorerPreference, setExplorerPreference] =
    useWatchLocalStorage<ExplorerPreference>({
      key: EXPLORER_PREFERENCE_STORAGE_KEY,
      initialValue: DEFAULT_EXPLORER_PREFERENCE,
      deserializer: (value) =>
        isExplorerPreference(value) ? value : DEFAULT_EXPLORER_PREFERENCE,
      serializer: (value) => value ?? DEFAULT_EXPLORER_PREFERENCE,
    });

  return {
    explorerPreference: explorerPreference ?? DEFAULT_EXPLORER_PREFERENCE,
    setExplorerPreference,
  };
}
