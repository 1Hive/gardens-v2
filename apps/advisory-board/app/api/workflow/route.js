import { boardAccess } from "../../../lib/access";
import { json } from "../../../lib/http";
import { readWorkflow } from "../../../lib/workflow-store";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const access = await boardAccess(request);
    if (!access) return json({ error: "No advisory access for this GitHub account" }, 403);
    return json({ workflow: await readWorkflow(access.advisories.map((item) => item.id)) });
  } catch {
    return json({ error: "Could not read shared workflow data" }, 503);
  }
}
