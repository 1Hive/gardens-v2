import { boardAccess } from "../../../lib/access";
import { loadActivity } from "../../../lib/advisories.mjs";
import { json } from "../../../lib/http";
import { readActivityCache, saveActivityCache } from "../../../lib/workflow-store";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request) {
  try {
    const access = await boardAccess(request);
    if (!access) return json({ error: "No advisory access for this GitHub account" }, 403);
    const ids = access.advisories.map((item) => item.id);
    const cached = new URL(request.url).searchParams.has("refresh") ? {} : await readActivityCache(ids);
    const result = await loadActivity(access.advisories, access.token, undefined, cached);
    const fresh = Object.fromEntries(Object.entries(result.activity).filter(([id]) => !cached[id]));
    await saveActivityCache(fresh);
    return json(result);
  } catch {
    return json({ error: "Could not read advisory activity from GitHub" }, 503);
  }
}
