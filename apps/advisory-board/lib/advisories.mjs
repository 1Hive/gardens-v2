const repository = "1Hive/gardens-v2";
const bountyPoolPath = "/gardens/10/0x59c47c30da2a0ca7359590f023da0284fef83e73/0x114964e7d57288eb8e117b98dd8972c514027025/";
const allowedTransitions = {
  triage: ["draft", "closed"],
  draft: ["published", "closed"],
  closed: ["draft"],
  published: [],
};

export function canTransition(from, to) {
  return allowedTransitions[from]?.includes(to) ?? false;
}

export class GithubError extends Error {
  constructor(status) {
    super(`GitHub returned ${status}`);
    this.status = status;
  }
}

export async function githubRequest(token, path, options = {}) {
  const response = await fetch(`https://api.github.com/${path}`, {
    method: options.method || "GET",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new GithubError(response.status);
  return response.json();
}

async function githubPages(token, path) {
  const items = [];
  for (let page = 1; page <= 10; page += 1) {
    const separator = path.includes("?") ? "&" : "?";
    const batch = await githubRequest(token, `${path}${separator}per_page=100&page=${page}`);
    if (!Array.isArray(batch)) throw new Error("Unexpected GitHub response");
    items.push(...batch);
    if (batch.length < 100) return items;
  }
  throw new Error("Advisory pagination limit reached");
}

export function projectAdvisory(advisory, fixedIds = new Set()) {
  const id = advisory.ghsa_id;
  if (!/^GHSA-[a-z0-9-]+$/i.test(id ?? "")) return null;

  return {
    id,
    title: advisory.summary || id,
    state: advisory.state || "unknown",
    severity: advisory.severity || "unknown",
    fixed: fixedIds.has(id),
    author: advisory.author?.login || "Unknown reporter",
    createdAt: advisory.created_at,
    updatedAt: advisory.updated_at,
    url: `https://github.com/${repository}/security/advisories/${id}`,
  };
}

export function parseFixedAdvisories(history) {
  const fixedIds = new Set();
  for (const line of history.split("\n")) {
    const match = /^\| \[(GHSA-[a-z0-9-]+)\]\([^)]+\) \| [^|]* \| [^|]* \| ([^|]*) \|/i.exec(line);
    if (!match) continue;
    const status = match[2].trim();
    if (/^Fixed and deployed(?:;|$)/i.test(status) ||
        /^Patched \/ (?:production-)?upgraded$/i.test(status)) {
      fixedIds.add(match[1]);
    }
  }
  return fixedIds;
}

async function readAdvisoryHistory() {
  const response = await fetch(`https://raw.githubusercontent.com/${repository}/main/security/advisory-history.md`, {
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error("Could not read advisory history");
  return response.text();
}

export async function loadAdvisories(token, fetchAll = fetchGithubAdvisories, readHistory = readAdvisoryHistory) {
  const advisories = await fetchAll(token);
  if (!Array.isArray(advisories)) throw new Error("Unexpected GitHub advisory response");
  let fixedIds = new Set();
  try { fixedIds = parseFixedAdvisories(await readHistory()); } catch { /* The board remains usable if history is unavailable. */ }
  return advisories.map((advisory) => projectAdvisory(advisory, fixedIds)).filter(Boolean);
}

async function fetchGithubAdvisories(token) {
  return githubPages(token, `repos/${repository}/security-advisories`);
}

export async function getAdvisory(token, id) {
  if (!/^GHSA-[a-z0-9-]+$/i.test(id)) throw new GithubError(400);
  return githubRequest(token, `repos/${repository}/security-advisories/${id}`);
}

export async function updateAdvisoryState(token, id, state) {
  if (!/^GHSA-[a-z0-9-]+$/i.test(id)) throw new GithubError(400);
  return githubRequest(token, `repos/${repository}/security-advisories/${id}`, {
    method: "PATCH", body: { state },
  });
}

export function summarizeComments(comments) {
  let proposalUrl = null;
  let recipientAddress = null;
  let hasReply = false;
  for (const comment of comments) {
    const fromTeam = ["OWNER", "MEMBER", "COLLABORATOR"].includes(comment.author_association);
    if (fromTeam) {
      hasReply = true;
    } else if (/\b(wallet|beneficiary|recipient|address)\b/i.test(comment.body || "")) {
      const addresses = [...new Set((comment.body || "").match(/0x[a-fA-F0-9]{40}\b/g) || [])];
      if (addresses.length === 1) recipientAddress = addresses[0];
    }
    if (!fromTeam) continue;
    for (const match of (comment.body || "").matchAll(/https:\/\/[^\s<>()[\]]+/g)) {
      try {
        const url = new URL(match[0].replace(/[.,;]+$/, ""));
        if (url.hostname === "app.gardens.fund" &&
            url.pathname.toLowerCase().startsWith(bountyPoolPath) &&
            /^proposal-\d+$/.test(url.pathname.slice(bountyPoolPath.length))) {
          proposalUrl = `${url.origin}${url.pathname}`;
        }
      } catch {
        // Ignore malformed URLs in comment text.
      }
    }
  }
  return { hasReply, recipientAddress, proposalUrl };
}

async function fetchGithubComments(token, id) {
  if (!/^GHSA-[a-z0-9-]+$/i.test(id)) throw new GithubError(400);
  return githubPages(token, `repos/${repository}/security-advisories/${id}/comments`);
}

export async function loadActivity(advisories, token, fetchComments = fetchGithubComments, cached = {}) {
  const activity = { ...cached };
  let next = 0;
  let unavailable = 0;
  await Promise.all(Array.from({ length: Math.min(6, advisories.length) }, async () => {
    while (next < advisories.length) {
      const id = advisories[next++].id;
      if (activity[id]) continue;
      try {
        activity[id] = summarizeComments(await fetchComments(token, id));
      } catch {
        activity[id] = { hasReply: null, recipientAddress: null, proposalUrl: null };
        unavailable += 1;
      }
    }
  }));
  return { activity, unavailable };
}
