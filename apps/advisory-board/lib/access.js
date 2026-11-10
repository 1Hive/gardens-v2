import { authorizedToken } from "./auth";
import { loadAdvisories } from "./advisories.mjs";

export async function boardAccess(request) {
  const token = await authorizedToken(request);
  if (!token) return null;
  const advisories = await loadAdvisories(token);
  if (!advisories.some((item) => item.state !== "published")) return null;
  return { token, advisories };
}
