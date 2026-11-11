import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const history = readFileSync(join(root, "security/advisory-history.md"), "utf8");
const coverage = readFileSync(join(root, "security/security-poc-coverage.md"), "utf8");

function readSolidityTests(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return readSolidityTests(path);
    return entry.name.endsWith(".t.sol") ? [readFileSync(path, "utf8")] : [];
  });
}

const solidityTests = readSolidityTests(join(root, "pkg/contracts/test")).join("\n");
const accepted = [...history.matchAll(/^\| \[(GHSA-[\w-]+)\]\([^\n]+?\) \| (Eligible[^|]*|Partially eligible[^|]*) \|/gm)]
  .map((match) => match[1]);
const rows = new Map(
  [...coverage.matchAll(/^\| (GHSA-[\w-]+)[^|]* \| ([^\n]+) \|$/gm)].map((match) => [match[1], match[2]])
);
const errors = [];

for (const id of accepted) {
  const row = rows.get(id);
  if (!row) {
    errors.push(`${id}: no regression test mapped`);
    continue;
  }
  const testNames = [...row.matchAll(/test[A-Za-z0-9_]+/g)].map((match) => match[0]);
  for (const name of testNames) {
    if (!solidityTests.includes(`function ${name}(`)) errors.push(`${id}: missing ${name}`);
  }
  if (testNames.length === 0) {
    const webTest = row.match(/(apps\/web\/[^:`]+\.test\.ts)::([^`]+)/);
    if (!webTest || !readFileSync(join(root, webTest[1]), "utf8").includes(webTest[2])) {
      errors.push(`${id}: no runnable regression test found`);
    }
  }
}

if (errors.length > 0) {
  for (const error of errors) console.error(error);
  process.exitCode = 1;
} else {
  console.log(`Verified regression coverage for ${accepted.length} accepted advisory entries.`);
}
