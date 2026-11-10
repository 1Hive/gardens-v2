import { boardAccess } from "../../../../../lib/access";
import { json, readSmallJson, sameOrigin } from "../../../../../lib/http";
import { readWorkflow, saveWorkflow } from "../../../../../lib/workflow-store";

const poolPath = "/gardens/10/0x59c47c30da2a0ca7359590f023da0284fef83e73/0x114964e7d57288eb8e117b98dd8972c514027025/";
const stages = new Set(["triage", "accepted", "recipient", "proposal"]);

function proposalUrl(input) {
  try {
    const url = new URL(input);
    if (url.protocol === "https:" && url.hostname === "app.gardens.fund" &&
        url.pathname.toLowerCase().startsWith(poolPath) &&
        /^proposal-\d+$/.test(url.pathname.slice(poolPath.length))) {
      return `${url.origin}${url.pathname}`;
    }
  } catch { /* Invalid URL. */ }
  return null;
}

export async function POST(request, { params }) {
  if (!sameOrigin(request)) return json({ error: "Invalid request origin" }, 403);
  try {
    const access = await boardAccess(request);
    if (!access) return json({ error: "No advisory access for this GitHub account" }, 403);
    const { id } = await params;
    const advisory = access.advisories.find((item) => item.id === id);
    if (!advisory) return json({ error: "Advisory not accessible" }, 404);
    if (!["triage", "draft"].includes(advisory.state)) return json({ error: "Advisory is not in an editable state" }, 409);
    const { stage, recipientAddress, bountyProposalUrl } = await readSmallJson(request);
    if (!stages.has(stage)) return json({ error: "Invalid workflow stage" }, 400);
    const previous = (await readWorkflow([id]))[id] || {};
    const value = stage === "triage" ? { stage } : { ...previous, stage };
    if (recipientAddress != null) {
      if (!/^0x[a-fA-F0-9]{40}$/.test(recipientAddress)) return json({ error: "Invalid recipient address" }, 400);
      value.recipientAddress = recipientAddress;
    }
    if (bountyProposalUrl != null) {
      const normalized = proposalUrl(bountyProposalUrl);
      if (!normalized) return json({ error: "Invalid bounty proposal link" }, 400);
      value.proposalUrl = normalized;
    }
    await saveWorkflow(id, value);
    return json({ workflow: value });
  } catch (error) {
    if (error instanceof SyntaxError) return json({ error: "Invalid JSON request" }, 400);
    if (error.message === "Expected JSON" || error.message === "Request is too large") {
      return json({ error: error.message }, 400);
    }
    return json({ error: "Could not save shared workflow data" }, 503);
  }
}
