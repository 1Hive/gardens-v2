import { useCallback, useEffect, useRef } from "react";

const DEFAULT_REFRESH_INTERVAL_MS = 60_000;

export function useVisibleRefetch(
  refetch: () => unknown,
  enabled: boolean,
  refreshKey: string,
  intervalMs = DEFAULT_REFRESH_INTERVAL_MS,
) {
  const refetchRef = useRef(refetch);
  refetchRef.current = refetch;
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;
  // The query fetches on mount, so its first timed refresh is due after a full interval.
  const lastRefreshAt = useRef(Date.now());

  const refresh = useCallback(() => {
    if (!enabledRef.current) return;
    lastRefreshAt.current = Date.now();
    void refetchRef.current();
  }, []);

  useEffect(() => {
    if (!enabled) return;
    lastRefreshAt.current = Date.now();
    const refreshIfStale = () => {
      if (
        document.visibilityState === "visible" &&
        Date.now() - lastRefreshAt.current >= intervalMs
      ) {
        refresh();
      }
    };
    const interval = window.setInterval(refreshIfStale, intervalMs);
    document.addEventListener("visibilitychange", refreshIfStale);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", refreshIfStale);
    };
  }, [enabled, intervalMs, refresh, refreshKey]);

  return refresh;
}
