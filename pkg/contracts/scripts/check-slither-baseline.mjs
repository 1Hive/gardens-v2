import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const baselinePath = path.resolve(scriptDir, "../slither-baseline.json");
const reportPath = path.resolve(process.argv[2] ?? "results.sarif");

const baseline = JSON.parse(await readFile(baselinePath, "utf8"));
const report = JSON.parse(await readFile(reportPath, "utf8"));
if (
  baseline.schemaVersion !== 1 ||
  !baseline.findings ||
  report.runs?.length !== 1 ||
  report.runs[0]?.tool?.driver?.name !== "Slither" ||
  !Array.isArray(report.runs[0].results)
) {
  throw new Error("Invalid Slither baseline or SARIF report");
}

const results = report.runs[0].results;
const approved = new Map(Object.entries(baseline.findings));
for (const [digest, count] of approved) {
  if (!/^[0-9a-f]{64}$/.test(digest) || !Number.isInteger(count) || count < 1) {
    throw new Error("Invalid Slither baseline entry");
  }
}
const seen = new Map();
const unreviewed = [];

function normalizeMessage(ruleId, message) {
  const withoutLines = message.replace(/#\d+(?:-\d+)?/g, "#");
  if (!ruleId.endsWith("reentrancy-no-eth")) {
    return withoutLines.replace(/\s+/g, " ").trim();
  }

  // Slither emits a nondeterministic order for sibling calls in reentrancy
  // traces. Sort bullets within each section while retaining their contents.
  const sections = [];
  let bullets = [];
  const flushBullets = () => {
    sections.push(...bullets.sort());
    bullets = [];
  };
  for (const line of withoutLines.split("\n")) {
    const normalized = line.replace(/\s+/g, " ").trim();
    if (!normalized) continue;
    if (normalized.startsWith("- ")) {
      bullets.push(normalized);
    } else {
      flushBullets();
      sections.push(normalized);
    }
  }
  flushBullets();
  return sections.join(" ");
}

for (const result of results) {
  const ruleId = result.ruleId;
  const message = result.message?.text;
  if (!ruleId || !message) throw new Error("Slither result lacks a rule or message");

  const normalized = normalizeMessage(ruleId, message);
  const digest = createHash("sha256").update(`${ruleId}\n${normalized}`).digest("hex");
  const count = (seen.get(digest) ?? 0) + 1;
  seen.set(digest, count);

  if (count > (approved.get(digest) ?? 0)) {
    const location = result.locations?.[0]?.physicalLocation;
    const source = location?.artifactLocation?.uri ?? "unknown source";
    const line = location?.region?.startLine ?? "?";
    unreviewed.push(`${ruleId} ${source}:${line} ${message.split("\n")[0]}`);
  }
}

if (unreviewed.length > 0) {
  console.error(`${unreviewed.length} unreviewed Slither finding(s):`);
  for (const finding of unreviewed) console.error(`- ${finding}`);
  process.exitCode = 1;
} else {
  console.log(`Slither baseline passed: ${results.length} baselined finding(s), none new.`);
}
