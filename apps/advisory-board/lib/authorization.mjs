import { githubRequest } from "./advisories.mjs";

export async function hasPrivateAdvisoryAccess(token, request = githubRequest) {
  const path = "repos/1Hive/gardens-v2/security-advisories";
  for (const state of ["triage", "draft", "closed"]) {
    const result = await request(token, `${path}?state=${state}&per_page=1`);
    if (!Array.isArray(result)) throw new Error("Unexpected GitHub advisory response");
    if (result.length > 0) return true;
  }
  return false;
}
