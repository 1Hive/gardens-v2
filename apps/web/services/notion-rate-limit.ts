type NotionRequestRunnerOptions = {
  minIntervalMs?: number;
  maxRetries?: number;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
  random?: () => number;
  onRetry?: (details: {
    operation: string;
    attempt: number;
    delayMs: number;
    error: unknown;
  }) => void;
};

const DEFAULT_MIN_INTERVAL_MS = 400;
const DEFAULT_MAX_RETRIES = 5;
const DEFAULT_RETRY_DELAY_MS = 1_000;
const RETRY_JITTER_MS = 250;

const defaultSleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

const parsePositiveSeconds = (value: unknown): number | null => {
  if (
    (typeof value !== "string" && typeof value !== "number") ||
    String(value).trim() === ""
  ) {
    return null;
  }
  const seconds = Number(value);
  return Number.isFinite(seconds) && seconds >= 0 ? seconds : null;
};

const parseBody = (body: unknown): Record<string, any> | null => {
  if (body && typeof body === "object") return body as Record<string, any>;
  if (typeof body !== "string") return null;
  try {
    return JSON.parse(body) as Record<string, any>;
  } catch {
    return null;
  }
};

export const isNotionRateLimitError = (error: unknown) => {
  if (!error || typeof error !== "object") return false;
  const candidate = error as Record<string, any>;
  return candidate.status === 429 || candidate.code === "rate_limited";
};

export const getNotionRetryAfterMs = (error: unknown): number | null => {
  if (!error || typeof error !== "object") return null;
  const candidate = error as Record<string, any>;
  const headers = candidate.headers;
  const headerValue =
    typeof headers?.get === "function" ?
      headers.get("retry-after")
    : headers?.["retry-after"] ?? headers?.["Retry-After"];
  const body = parseBody(candidate.body);
  const seconds =
    parsePositiveSeconds(headerValue) ??
    parsePositiveSeconds(candidate.additional_data?.retry_after) ??
    parsePositiveSeconds(body?.additional_data?.retry_after);
  return seconds == null ? null : seconds * 1_000;
};

export const createNotionRequestRunner = ({
  minIntervalMs = DEFAULT_MIN_INTERVAL_MS,
  maxRetries = DEFAULT_MAX_RETRIES,
  sleep = defaultSleep,
  now = Date.now,
  random = Math.random,
  onRetry,
}: NotionRequestRunnerOptions = {}) => {
  let queue: Promise<void> = Promise.resolve();
  let nextRequestAt = 0;

  return async <T>(
    operation: string,
    request: () => Promise<T>,
  ): Promise<T> => {
    const execute = async () => {
      for (let attempt = 0; ; attempt += 1) {
        const intervalDelay = Math.max(0, nextRequestAt - now());
        if (intervalDelay > 0) await sleep(intervalDelay);
        nextRequestAt = now() + minIntervalMs;

        try {
          return await request();
        } catch (error) {
          if (!isNotionRateLimitError(error) || attempt >= maxRetries) {
            throw error;
          }
          const retryAfterMs =
            getNotionRetryAfterMs(error) ??
            DEFAULT_RETRY_DELAY_MS * 2 ** attempt;
          const delayMs =
            Math.max(minIntervalMs, retryAfterMs) +
            Math.floor(random() * RETRY_JITTER_MS);
          onRetry?.({
            operation,
            attempt: attempt + 1,
            delayMs,
            error,
          });
          await sleep(delayMs);
        }
      }
    };

    const result = queue.then(execute, execute);
    queue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  };
};
