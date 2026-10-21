import { MarkeeApiError } from "@/services/markee";

/** Single-flight polling, bounded retries, and no automatic retry of unavailable routes. */
export function pollMarkeeClaimQuote({
  load,
  onError,
  signal,
}: {
  load: () => Promise<{ expiresAt: number }>;
  onError: (error: unknown) => void;
  signal: AbortSignal;
}) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let failures = 0;
  const stop = () => {
    if (timer != null) clearTimeout(timer);
  };
  signal.addEventListener("abort", stop, { once: true });
  const refresh = async () => {
    if (signal.aborted) return;
    let delay: number;
    try {
      const quote = await load();
      failures = 0;
      delay = Math.max(quote.expiresAt * 1000 - Date.now(), 15_000);
    } catch (error) {
      if (signal.aborted) return;
      onError(error);
      if (
        (error instanceof MarkeeApiError && !error.retryable) ||
        failures >= 3
      )
        return;
      delay = 15_000 * 2 ** failures++;
    }
    if (!signal.aborted) timer = setTimeout(() => void refresh(), delay);
  };
  void refresh();
  return () => {
    stop();
    signal.removeEventListener("abort", stop);
  };
}
