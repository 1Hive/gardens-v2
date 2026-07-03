import * as Sentry from "@sentry/nextjs";

import { stringifyJson } from "./json";

type ClientErrorContext = Record<string, unknown>;

const MAX_STRING_LENGTH = 2_000;
const MAX_STACK_LENGTH = 6_000;

const truncate = (value: string, maxLength: number) =>
  value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;

const toSerializable = (value: unknown): unknown => {
  if (value == null) return value;

  if (typeof value === "bigint") {
    return value.toString();
  }

  if (typeof value === "string") {
    return truncate(value, MAX_STRING_LENGTH);
  }

  try {
    return JSON.parse(stringifyJson(value));
  } catch {
    return String(value);
  }
};

const serializeError = (error: unknown) => {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: truncate(error.message, MAX_STRING_LENGTH),
      stack: error.stack ? truncate(error.stack, MAX_STACK_LENGTH) : undefined,
      cause: toSerializable(error.cause),
    };
  }

  return {
    name: "NonError",
    message: truncate(String(error), MAX_STRING_LENGTH),
  };
};

export function reportClientError(
  error: unknown,
  context: ClientErrorContext = {},
) {
  const serializedError = serializeError(error);
  const serializableContext = toSerializable(context) as ClientErrorContext;
  const payload = {
    source: "client",
    error: serializedError,
    context: serializableContext,
    url: typeof window === "undefined" ? undefined : window.location.href,
    userAgent:
      typeof navigator === "undefined" ? undefined : navigator.userAgent,
    timestamp: new Date().toISOString(),
  };

  Sentry.withScope((scope) => {
    const tags = serializableContext.tags;
    if (tags && typeof tags === "object") {
      Object.entries(tags as Record<string, unknown>).forEach(([key, value]) => {
        scope.setTag(key, String(value));
      });
    }

    scope.setContext("client_error", payload);
    Sentry.captureException(
      error instanceof Error ? error : new Error(serializedError.message),
    );
  });

  if (typeof window === "undefined") return;

  void fetch("/api/client-error", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: stringifyJson(payload),
    keepalive: true,
  }).catch((loggingError) => {
    console.warn("[client-error] failed to report error", loggingError);
  });
}
