import assert from "node:assert/strict";
import test from "node:test";
import { canTransition, loadActivity, loadAdvisories, parseFixedAdvisories, projectAdvisory, summarizeComments } from "./advisories.mjs";
import { transitionAdvisory, TransitionError } from "./transition.mjs";
import { stageFor } from "./workflow.mjs";

test("saved accepted cards advance when a researcher supplies an address", () => {
  const advisory = { state: "draft" };
  const saved = { stage: "accepted" };
  assert.equal(stageFor(advisory, { hasReply: true }, saved), "accepted");
  assert.equal(stageFor(advisory, {
    hasReply: true,
    recipientAddress: "0x2440c2ffcf4bf638d194a8a02f844c10eba39964",
  }, saved), "recipient");
});

test("saved recipient cards advance when a bounty proposal is linked", () => {
  const advisory = { state: "draft" };
  assert.equal(stageFor(advisory, {
    hasReply: true,
    proposalUrl: "https://app.gardens.fund/gardens/10/community/pool/proposal-31",
  }, { stage: "recipient" }), "proposal");
  assert.equal(stageFor({ state: "closed" }, { hasReply: true, proposalUrl: "example" }, {
    stage: "recipient",
  }), "closed");
});

test("projects only safe summary fields", () => {
  const result = projectAdvisory({
    ghsa_id: "GHSA-abcd-1234-efgh",
    summary: "Example advisory",
    description: "Private exploit details",
    state: "triage",
    severity: "high",
    author: { login: "researcher" },
    created_at: "2026-11-09T00:00:00Z",
  });
  assert.equal(result.title, "Example advisory");
  assert.equal(result.author, "researcher");
  assert.equal("description" in result, false);
  assert.equal(result.url, "https://github.com/1Hive/gardens-v2/security/advisories/GHSA-abcd-1234-efgh");
});

test("projects the complete paginated GitHub result", async () => {
  const result = await loadAdvisories("test-token", async () => [
    { ghsa_id: "GHSA-first-1234-abcd" },
    { ghsa_id: "GHSA-last-1234-abcd" },
  ], async () => "");
  assert.deepEqual(result.map((advisory) => advisory.id), [
    "GHSA-first-1234-abcd",
    "GHSA-last-1234-abcd",
  ]);
});

test("only confirmed on-chain rollout statuses receive Fixed", () => {
  const row = (id, status) => `| [${id}](https://github.com/1Hive/gardens-v2/security/advisories/${id}) | Eligible | Medium | ${status} | Contract | Notes |`;
  const history = [
    row("GHSA-fixed-1234-abcd", "Fixed and deployed"),
    row("GHSA-upgraded-1234-abcd", "Patched / production-upgraded"),
    row("GHSA-patched-1234-abcd", "Closed; patched in commit"),
    row("GHSA-partial-1234-abcd", "Primary path fixed and deployed; another path remains open"),
  ].join("\n");
  const fixedIds = parseFixedAdvisories(history);
  assert.deepEqual([...fixedIds], ["GHSA-fixed-1234-abcd", "GHSA-upgraded-1234-abcd"]);
  assert.equal(projectAdvisory({ ghsa_id: "GHSA-fixed-1234-abcd", state: "published" }, fixedIds).fixed, true);
  assert.equal(projectAdvisory({ ghsa_id: "GHSA-patched-1234-abcd" }, fixedIds).fixed, false);
});

test("summarizes team replies, researcher address, and latest bounty proposal", () => {
  const pool = "https://app.gardens.fund/gardens/10/0x59c47c30da2a0ca7359590f023da0284fef83e73/0x114964e7d57288eb8e117b98dd8972c514027025";
  const result = summarizeComments([
    { author_association: "MEMBER", body: `Bounty: ${pool}/proposal-25` },
    { author_association: "NONE", body: "My Optimism wallet address is 0x2440c2ffcf4bf638d194a8a02f844c10eba39964" },
    { author_association: "MEMBER", body: `Recreated at [proposal](${pool}/proposal-31).` },
  ]);
  assert.equal(result.hasReply, true);
  assert.equal(result.recipientAddress, "0x2440c2ffcf4bf638d194a8a02f844c10eba39964");
  assert.equal(result.proposalUrl, `${pool}/proposal-31`);
});

test("does not treat unrelated addresses or proposal URLs as bounty evidence", () => {
  const result = summarizeComments([
    { author_association: "NONE", body: "PoC contract 0x2440c2ffcf4bf638d194a8a02f844c10eba39964" },
    { author_association: "MEMBER", body: "https://app.gardens.fund/gardens/10/other/pool/proposal-3" },
  ]);
  assert.equal(result.hasReply, true);
  assert.equal(result.recipientAddress, null);
  assert.equal(result.proposalUrl, null);
});

test("a researcher-posted pool link does not count as a created proposal", () => {
  const result = summarizeComments([{
    author_association: "NONE",
    body: "I found https://app.gardens.fund/gardens/10/0x59c47c30da2a0ca7359590f023da0284fef83e73/0x114964e7d57288eb8e117b98dd8972c514027025/proposal-99",
  }]);
  assert.equal(result.proposalUrl, null);
});

test("activity reports inaccessible comments without treating them as unanswered", async () => {
  const result = await loadActivity([{ id: "GHSA-one" }, { id: "GHSA-two" }], "test-token", async (_, id) => {
    if (id === "GHSA-two") throw new Error("Unavailable");
    return [{ author_association: "OWNER", body: "Acknowledged" }];
  });
  assert.equal(result.activity["GHSA-one"].hasReply, true);
  assert.equal(result.activity["GHSA-two"].hasReply, null);
  assert.equal(result.unavailable, 1);
});

test("activity reuses authorized cached summaries", async () => {
  const cached = { "GHSA-cached": { hasReply: true, recipientAddress: null, proposalUrl: null } };
  let calls = 0;
  const result = await loadActivity([{ id: "GHSA-cached" }, { id: "GHSA-new" }], "token", async () => {
    calls += 1;
    return [{ author_association: "OWNER", body: "Acknowledged" }];
  }, cached);
  assert.equal(calls, 1);
  assert.equal(result.activity["GHSA-cached"].hasReply, true);
  assert.equal(result.activity["GHSA-new"].hasReply, true);
});

test("only supported GitHub state transitions are exposed", () => {
  assert.equal(canTransition("triage", "draft"), true);
  assert.equal(canTransition("closed", "draft"), true);
  assert.equal(canTransition("draft", "published"), true);
  assert.equal(canTransition("draft", "triage"), false);
  assert.equal(canTransition("published", "draft"), false);
});

test("transition checks live state before writing", async () => {
  let writes = 0;
  const api = {
    getAdvisory: async () => ({ ghsa_id: "GHSA-abcd-1234-efgh", state: "closed" }),
    updateAdvisoryState: async () => { writes += 1; },
  };
  await assert.rejects(
    transitionAdvisory({ id: "GHSA-abcd-1234-efgh", from: "draft", to: "published" }, api),
    (error) => error instanceof TransitionError && error.status === 409,
  );
  assert.equal(writes, 0);
});

test("transition returns only the confirmed GitHub state", async () => {
  const result = await transitionAdvisory(
    { id: "GHSA-abcd-1234-efgh", from: "triage", to: "draft" },
    {
      getAdvisory: async () => ({ ghsa_id: "GHSA-abcd-1234-efgh", state: "triage" }),
      updateAdvisoryState: async () => ({ ghsa_id: "GHSA-abcd-1234-efgh", state: "draft", description: "Private" }),
    },
  );
  assert.deepEqual(result, { id: "GHSA-abcd-1234-efgh", state: "draft" });
});
