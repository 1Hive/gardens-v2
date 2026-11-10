import { Redis } from "@upstash/redis";

const key = "gardens:advisory-board:workflow:v1";
const activityKey = "gardens:advisory-board:activity:v1";
let redis;
const local = new Map();
const localActivity = new Map();

function client() {
  if (process.env.NODE_ENV === "development" && !process.env.UPSTASH_REDIS_REST_URL) return null;
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    throw new Error("Shared workflow storage is not configured");
  }
  redis ??= Redis.fromEnv();
  return redis;
}

export async function readWorkflow(ids) {
  const allowed = new Set(ids);
  const source = client() ? await client().hgetall(key) || {} : Object.fromEntries(local);
  return Object.fromEntries(Object.entries(source).filter(([id]) => allowed.has(id)));
}

export async function saveWorkflow(id, value) {
  const storage = client();
  if (!storage) {
    local.set(id, value);
  } else {
    await storage.hset(key, { [id]: value });
  }
}

export async function readActivityCache(ids) {
  const source = client() ? await client().hgetall(activityKey) || {} : Object.fromEntries(localActivity);
  const cutoff = Date.now() - 15 * 60_000;
  return Object.fromEntries(ids.flatMap((id) => {
    const entry = source[id];
    return entry?.at > cutoff && entry.summary?.hasReply != null ? [[id, entry.summary]] : [];
  }));
}

export async function saveActivityCache(activity) {
  const entries = Object.entries(activity).filter(([, summary]) => summary.hasReply != null);
  if (!entries.length) return;
  const at = Date.now();
  const values = Object.fromEntries(entries.map(([id, summary]) => [id, { at, summary }]));
  const storage = client();
  if (!storage) {
    for (const [id, value] of Object.entries(values)) localActivity.set(id, value);
  } else {
    await storage.hset(activityKey, values);
  }
}
