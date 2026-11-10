import { boardAccess } from "../../../../../lib/access";
import { getAdvisory, updateAdvisoryState } from "../../../../../lib/advisories.mjs";
import { json, readSmallJson, sameOrigin } from "../../../../../lib/http";
import { transitionAdvisory, TransitionError } from "../../../../../lib/transition.mjs";

export const dynamic = "force-dynamic";

export async function POST(request, { params }) {
  if (!sameOrigin(request)) return json({ error: "Invalid request origin" }, 403);
  try {
    const access = await boardAccess(request);
    if (!access) return json({ error: "No advisory access for this GitHub account" }, 403);
    const { id } = await params;
    if (!access.advisories.some((item) => item.id === id)) return json({ error: "Advisory not accessible" }, 404);
    const { from, to } = await readSmallJson(request);
    const result = await transitionAdvisory({ id, from, to }, {
      getAdvisory: (key) => getAdvisory(access.token, key),
      updateAdvisoryState: (key, state) => updateAdvisoryState(access.token, key, state),
    });
    return json(result);
  } catch (error) {
    if (error instanceof TransitionError) return json({ error: error.message }, error.status);
    if (error instanceof SyntaxError) return json({ error: "Invalid JSON request" }, 400);
    if (error.message === "Expected JSON" || error.message === "Request is too large") {
      return json({ error: error.message }, 400);
    }
    return json({ error: "GitHub could not complete this transition" }, 502);
  }
}
