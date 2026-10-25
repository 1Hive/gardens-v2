type NotionRequestRunnerOptions = {
  minIntervalMs?: number;
  maxRetries?: number;
  maxTransientRetries?: number;
  // Bounds when retries may start; does not cancel an in-flight SDK request.
  maxRetryStartElapsedMs?: number;
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
const DEFAULT_MAX_TRANSIENT_RETRIES = 3;
const DEFAULT_MAX_RETRY_START_ELAPSED_MS = 60_000;
const DEFAULT_RETRY_DELAY_MS = 1_000;
const MAX_RETRY_DELAY_MS = 8_000;
const RETRY_JITTER_MS = 250;

type NotionRequestOptions = {
  // Only opt in for reads and idempotent writes, never ambiguous page creates.
  retryTransient?: boolean;
  deadlineMs?: number;
  requestTimeoutMs?: number;
};

export class NotionRequestBudgetExceededError extends Error {
  readonly code = "notion_sync_budget_exceeded";

  constructor(
    operation: string,
    readonly requestAttempted: boolean,
  ) {
    super(`Notion sync time budget exhausted before ${operation}`);
    this.name = "NotionRequestBudgetExceededError";
  }
}

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

export const isNotionTransientError = (error: unknown) => {
  if (!error || typeof error !== "object") return false;
  const candidate = error as Record<string, any>;
  return (
    [500, 502, 503, 504].includes(candidate.status) ||
    [
      "internal_server_error",
      "service_unavailable",
      "gateway_timeout",
    ].includes(candidate.code)
  );
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
  maxTransientRetries = DEFAULT_MAX_TRANSIENT_RETRIES,
  maxRetryStartElapsedMs = DEFAULT_MAX_RETRY_START_ELAPSED_MS,
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
    {
      retryTransient = false,
      deadlineMs = Infinity,
      requestTimeoutMs = 0,
    }: NotionRequestOptions = {},
  ): Promise<T> => {
    const execute = async () => {
      const startedAt = now();
      let requestAttempted = false;
      const ensureTimeBudget = (delayMs: number) => {
        // Leave room for the SDK's request timeout, not just the backoff.
        if (now() + delayMs + requestTimeoutMs >= deadlineMs) {
          throw new NotionRequestBudgetExceededError(
            operation,
            requestAttempted,
          );
        }
      };
      for (let attempt = 0; ; attempt += 1) {
        const intervalDelay = Math.max(0, nextRequestAt - now());
        ensureTimeBudget(intervalDelay);
        if (intervalDelay > 0) await sleep(intervalDelay);
        ensureTimeBudget(0);
        nextRequestAt = now() + minIntervalMs;

        try {
          requestAttempted = true;
          return await request();
        } catch (error) {
          const retryable =
            isNotionRateLimitError(error) ||
            (retryTransient &&
              isNotionTransientError(error) &&
              attempt < maxTransientRetries);
          // maxRetries is also a shared ceiling for mixed 429/5xx sequences.
          if (!retryable || attempt >= maxRetries) {
            throw error;
          }
          const retryAfterMs =
            getNotionRetryAfterMs(error) ??
            Math.min(MAX_RETRY_DELAY_MS, DEFAULT_RETRY_DELAY_MS * 2 ** attempt);
          const delayMs =
            Math.max(minIntervalMs, retryAfterMs) +
            Math.floor(random() * RETRY_JITTER_MS);
          // Never shorten Retry-After to fit the budget; defer to a later run.
          if (now() - startedAt + delayMs >= maxRetryStartElapsedMs)
            throw error;
          ensureTimeBudget(delayMs);
          onRetry?.({
            operation,
            attempt: attempt + 1,
            delayMs,
            error,
          });
          await sleep(delayMs);
          if (now() - startedAt >= maxRetryStartElapsedMs) throw error;
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
