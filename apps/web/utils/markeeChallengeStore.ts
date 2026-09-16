const REDIS_REQUEST_TIMEOUT_MS = 5_000;
const KEY_PREFIX = "gardens:markee:authorization";
const ISSUE_WINDOW_SECONDS = 60;
const MAX_GLOBAL_ISSUES_PER_WINDOW = 120;
const MAX_SUBJECT_ISSUES_PER_WINDOW = 12;

type StoredChallenge = {
  expiresAt: number;
  value: unknown;
};

const memoryChallenges = new Map<string, StoredChallenge>();
const memoryIssueCounts = new Map<
  string,
  { count: number; expiresAt: number }
>();

export class MarkeeChallengeStoreUnavailableError extends Error {
  constructor(message = "Markee authorization storage is unavailable.") {
    super(message);
    this.name = "MarkeeChallengeStoreUnavailableError";
  }
}

export class MarkeeChallengeRateLimitError extends Error {
  constructor(message = "Too many Markee authorization requests.") {
    super(message);
    this.name = "MarkeeChallengeRateLimitError";
  }
}

const getRedisConfig = () => {
  const url = (
    process.env.MARKEE_AUTH_REDIS_REST_URL ??
    process.env.KV_REST_API_URL ??
    process.env.UPSTASH_REDIS_REST_URL
  )?.trim();
  const token = (
    process.env.MARKEE_AUTH_REDIS_REST_TOKEN ??
    process.env.KV_REST_API_TOKEN ??
    process.env.UPSTASH_REDIS_REST_TOKEN
  )?.trim();

  return url && token ? { token, url: url.replace(/\/$/u, "") } : null;
};

const getKey = (namespace: string, nonce: string) =>
  `${KEY_PREFIX}:${namespace}:${nonce}`;

const serialize = (value: unknown) =>
  JSON.stringify(value, (_key, nestedValue: unknown) =>
    typeof nestedValue === "bigint" ?
      { __gardensMarkeeBigInt: nestedValue.toString() }
    : nestedValue,
  );

const deserialize = <T>(value: string): T =>
  JSON.parse(value, (_key, nestedValue: unknown) => {
    if (
      typeof nestedValue === "object" &&
      nestedValue !== null &&
      Object.keys(nestedValue).length === 1 &&
      "__gardensMarkeeBigInt" in nestedValue &&
      typeof nestedValue.__gardensMarkeeBigInt === "string"
    ) {
      return BigInt(nestedValue.__gardensMarkeeBigInt);
    }
    return nestedValue;
  }) as T;

const redisCommand = async <T>(command: Array<string | number>): Promise<T> => {
  const config = getRedisConfig();
  if (!config) throw new MarkeeChallengeStoreUnavailableError();

  let response: Response;
  try {
    response = await fetch(config.url, {
      body: JSON.stringify(command),
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${config.token}`,
        "Content-Type": "application/json",
      },
      method: "POST",
      signal: AbortSignal.timeout(REDIS_REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    throw new MarkeeChallengeStoreUnavailableError(
      error instanceof Error ? error.message : undefined,
    );
  }

  const body = (await response.json().catch(() => null)) as {
    error?: string;
    result?: T;
  } | null;
  if (!response.ok || body == null || body.error != null) {
    throw new MarkeeChallengeStoreUnavailableError(
      body?.error ?? `Redis returned HTTP ${response.status}.`,
    );
  }
  return body.result as T;
};

const requireDurableStoreInProduction = () => {
  if (process.env.NODE_ENV === "production" && getRedisConfig() == null) {
    throw new MarkeeChallengeStoreUnavailableError();
  }
};

export const saveMarkeeChallenge = async <T>({
  namespace,
  nonce,
  ttlSeconds,
  value,
}: {
  namespace: string;
  nonce: string;
  ttlSeconds: number;
  value: T;
}) => {
  requireDurableStoreInProduction();
  const key = getKey(namespace, nonce);
  const config = getRedisConfig();
  if (config != null) {
    const result = await redisCommand<"OK" | null>([
      "SET",
      key,
      serialize(value),
      "EX",
      ttlSeconds,
      "NX",
    ]);
    if (result !== "OK") {
      throw new MarkeeChallengeStoreUnavailableError(
        "Authorization nonce already exists.",
      );
    }
    return;
  }

  memoryChallenges.set(key, {
    expiresAt: Math.floor(Date.now() / 1000) + ttlSeconds,
    value,
  });
};

const incrementMemoryIssueCount = (key: string, now: number) => {
  const current = memoryIssueCounts.get(key);
  if (current == null || current.expiresAt <= now) {
    memoryIssueCounts.set(key, {
      count: 1,
      expiresAt: now + ISSUE_WINDOW_SECONDS,
    });
    return 1;
  }
  current.count += 1;
  return current.count;
};

/**
 * Reserves issuance capacity before any RPC or quote work. Redis evaluates the
 * global and per-community counters together so serverless instances cannot
 * independently exhaust upstream provider or storage quotas.
 */
export const reserveMarkeeChallengeIssue = async ({
  namespace,
  subject,
}: {
  namespace: string;
  subject: string;
}) => {
  requireDurableStoreInProduction();
  // The shared hash tag keeps both keys in one Redis Cluster slot so the Lua
  // script stays atomic on clustered providers as well as single-node Redis.
  const globalKey = `${KEY_PREFIX}:rate:{${namespace}}:global`;
  const subjectKey = `${KEY_PREFIX}:rate:{${namespace}}:${subject}`;
  const config = getRedisConfig();

  let allowed: number;
  if (config != null) {
    allowed = await redisCommand<number>([
      "EVAL",
      "local global = redis.call('INCR', KEYS[1]); if global == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]); end; local subject = redis.call('INCR', KEYS[2]); if subject == 1 then redis.call('EXPIRE', KEYS[2], ARGV[1]); end; if global > tonumber(ARGV[2]) or subject > tonumber(ARGV[3]) then return 0; end; return 1",
      2,
      globalKey,
      subjectKey,
      ISSUE_WINDOW_SECONDS,
      MAX_GLOBAL_ISSUES_PER_WINDOW,
      MAX_SUBJECT_ISSUES_PER_WINDOW,
    ]);
  } else {
    const now = Math.floor(Date.now() / 1000);
    const globalCount = incrementMemoryIssueCount(globalKey, now);
    const subjectCount = incrementMemoryIssueCount(subjectKey, now);
    allowed =
      (
        globalCount <= MAX_GLOBAL_ISSUES_PER_WINDOW &&
        subjectCount <= MAX_SUBJECT_ISSUES_PER_WINDOW
      ) ?
        1
      : 0;
  }

  if (allowed !== 1) throw new MarkeeChallengeRateLimitError();
};

export const consumeMarkeeChallenge = async <T>({
  namespace,
  nonce,
}: {
  namespace: string;
  nonce: string;
}): Promise<T | null> => {
  requireDurableStoreInProduction();
  const key = getKey(namespace, nonce);
  const config = getRedisConfig();
  if (config != null) {
    // Redis EVAL keeps read-and-delete atomic on providers that predate GETDEL.
    const serialized = await redisCommand<string | null>([
      "EVAL",
      "local value = redis.call('GET', KEYS[1]); if value then redis.call('DEL', KEYS[1]); end; return value",
      1,
      key,
    ]);
    return serialized == null ? null : deserialize<T>(serialized);
  }

  const stored = memoryChallenges.get(key);
  memoryChallenges.delete(key);
  if (stored == null || stored.expiresAt <= Math.floor(Date.now() / 1000)) {
    return null;
  }
  return stored.value as T;
};

export const clearMarkeeChallengesForTests = (namespace?: string) => {
  if (process.env.NODE_ENV !== "test") return;
  const namespacePrefix =
    namespace == null ? `${KEY_PREFIX}:` : `${KEY_PREFIX}:${namespace}:`;
  for (const key of memoryChallenges.keys()) {
    if (key.startsWith(namespacePrefix)) memoryChallenges.delete(key);
  }
  for (const key of memoryIssueCounts.keys()) {
    if (key.startsWith(`${KEY_PREFIX}:rate:`)) memoryIssueCounts.delete(key);
  }
};
