import { boardAccess } from "../../../lib/access";
import { json } from "../../../lib/http";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const access = await boardAccess(request);
    if (!access) return json({ error: "No advisory access for this GitHub account" }, 403);
    return json({ advisories: access.advisories, syncedAt: new Date().toISOString() });
  } catch {
    return json({ error: "Could not read advisories from GitHub" }, 503);
  }
}
