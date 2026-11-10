const activeStages = ["triage", "accepted", "recipient", "proposal"];

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
