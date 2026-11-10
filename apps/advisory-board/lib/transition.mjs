import { canTransition } from "./advisories.mjs";

export class TransitionError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export async function transitionAdvisory({ id, from, to }, api) {
  if (!/^GHSA-[a-z0-9-]+$/i.test(id ?? "") ||
      !["triage", "draft", "published", "closed"].includes(from) ||
      !["draft", "published", "closed"].includes(to)) {
    throw new TransitionError(400, "Invalid advisory transition");
  }
  if (!canTransition(from, to)) {
    throw new TransitionError(400, `Cannot move an advisory from ${from} to ${to}`);
  }

  const current = await api.getAdvisory(id);
  if (current.ghsa_id !== id || current.state !== from) {
    throw new TransitionError(409, "Advisory state changed on GitHub. Refresh the board and try again.");
  }

  const updated = await api.updateAdvisoryState(id, to);
  if (updated.ghsa_id !== id || updated.state !== to) {
    throw new TransitionError(502, "GitHub did not confirm the new state. Refresh the board.");
  }
  return { id, state: updated.state };
}
