const activeStages = ["triage", "accepted", "recipient", "proposal"];

export function requiresPublishConfirmation(advisory) {
  return !advisory.fixed;
}

export function hasTag(advisory, tag, activity = {}, saved = {}) {
  switch (tag) {
    case "all": return true;
    case "replied": return Boolean(activity.hasReply);
    case "fixed": return Boolean(advisory.fixed);
    case "proposal": return Boolean(activity.proposalUrl || saved.proposalUrl);
    case "github-draft": return advisory.state === "draft" && stageFor(advisory, activity, saved) === "triage";
    default: return false;
  }
}

export function stageFor(advisory, activity = {}, saved = {}) {
  if (advisory.state === "published" || advisory.state === "closed") return advisory.state;

  const savedIndex = activeStages.indexOf(saved.stage);
  let evidenceIndex = 0;
  if (advisory.state === "draft") {
    if (activity.hasReply) evidenceIndex = 1;
    if (activity.hasReply && (activity.recipientAddress || saved.recipientAddress)) evidenceIndex = 2;
    if (activity.proposalUrl || saved.proposalUrl) evidenceIndex = 3;
  }
  return activeStages[Math.max(savedIndex, evidenceIndex)];
}
