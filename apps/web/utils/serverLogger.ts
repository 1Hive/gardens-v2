type ServerLogContext = Record<string, unknown>;

type DeliveryResult =
  | { status: "sent" }
  | {
      status: "skipped";
      reason: "not-production" | "missing-webhook" | "duplicate";
    }
  | { status: "failed"; reason: string };

const DISCORD_DESCRIPTION_LIMIT = 4_000;
const DISCORD_FIELD_LIMIT = 1_000;
const MAX_DEPTH = 5;
const REDACTED = "[redacted]";
const SENSITIVE_KEY =
  /authorization|cookie|password|private.?key|secret|token|webhook|api.?key/i;
const reportedErrors = new WeakSet<object>();

const truncate = (value: string, maxLength: number) =>
  value.length > maxLength ? `${value.slice(0, maxLength - 3)}...` : value;

const isProductionDeployment = () => {
  if (process.env.VERCEL_ENV) {
    return process.env.VERCEL_ENV === "production";
  }

  return process.env.NEXT_PUBLIC_ENV_GARDENS === "prod";
};

const serialize = (
  value: unknown,
  seen = new WeakSet<object>(),
  depth = 0,
): unknown => {
  if (
    value == null ||
    typeof value === "boolean" ||
    typeof value === "number"
  ) {
    return value;
  }

  if (typeof value === "bigint") return value.toString();
  if (typeof value === "string") return truncate(value, 2_000);
  if (typeof value !== "object") return String(value);
  if (seen.has(value)) return "[circular]";
  if (depth >= MAX_DEPTH) return "[max depth]";

  seen.add(value);

  if (Array.isArray(value)) {
    return value.slice(0, 25).map((item) => serialize(item, seen, depth + 1));
  }

  return Object.fromEntries(
    Object.entries(value)
      .slice(0, 50)
      .map(([key, item]) => [
        key,
        SENSITIVE_KEY.test(key) ? REDACTED : serialize(item, seen, depth + 1),
      ]),
  );
};

const normalizeError = (error: unknown) => {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      cause: serialize(error.cause),
    };
  }

  return {
    name: "NonError",
    message:
      typeof error === "string" ? error : (
        JSON.stringify(serialize(error)) ?? String(error)
      ),
  };
};

const formatCodeBlock = (value: string) =>
  `\`\`\`\n${truncate(value.replaceAll("```", "'''"), DISCORD_DESCRIPTION_LIMIT)}\n\`\`\``;

async function reportError(
  error: unknown,
  context: ServerLogContext = {},
): Promise<DeliveryResult> {
  // Keep the platform log as the primary, lossless record in every environment.
  // eslint-disable-next-line no-console
  console.error("[server-error]", error, context);

  if (!isProductionDeployment()) {
    return { status: "skipped", reason: "not-production" };
  }

  const webhookUrl = process.env.DISCORD_ERROR_WEBHOOK_URL?.trim();
  if (!webhookUrl) {
    return { status: "skipped", reason: "missing-webhook" };
  }

  if (typeof error === "object" && error !== null) {
    if (reportedErrors.has(error)) {
      return { status: "skipped", reason: "duplicate" };
    }
    reportedErrors.add(error);
  }

  const normalizedError = normalizeError(error);
  const serializedContext = JSON.stringify(serialize(context), null, 2);
  const details = normalizedError.stack || normalizedError.message;

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        username: "Gardens error logger",
        allowed_mentions: { parse: [] },
        embeds: [
          {
            title: truncate(`Server error: ${normalizedError.name}`, 256),
            description: formatCodeBlock(details),
            color: 15_148_055,
            fields: [
              {
                name: "Context",
                value: formatCodeBlock(
                  truncate(serializedContext, DISCORD_FIELD_LIMIT),
                ),
              },
              {
                name: "Environment",
                value: process.env.VERCEL_ENV || "production",
                inline: true,
              },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      }),
      signal: AbortSignal.timeout(5_000),
    });

    if (!response.ok) {
      throw new Error(`Discord webhook returned ${response.status}`);
    }

    return { status: "sent" };
  } catch (deliveryError) {
    const reason =
      deliveryError instanceof Error ?
        deliveryError.message
      : "Unknown Discord delivery error";
    // eslint-disable-next-line no-console
    console.error("[server-error] Discord delivery failed", reason);
    return { status: "failed", reason };
  }
}

export const logger = {
  error: reportError,
};

export function withServerErrorLogging<Args extends unknown[], Result>(
  handler: (...args: Args) => Result | Promise<Result>,
  context: ServerLogContext = {},
) {
  return async (...args: Args): Promise<Result> => {
    try {
      return await handler(...args);
    } catch (error) {
      await logger.error(error, context);
      throw error;
    }
  };
}
