import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const history = readFileSync(
  join(root, "security/advisory-history.md"),
  "utf8",
);
const coverage = readFileSync(
  join(root, "security/security-poc-coverage.md"),
  "utf8",
);
const remediation = JSON.parse(
  readFileSync(
    join(root, "pkg/contracts/scripts/security-poc-remediation-coverage.json"),
    "utf8",
  ),
);

function readSolidityTests(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return readSolidityTests(path);
    return entry.name.endsWith(".t.sol") ? [readFileSync(path, "utf8")] : [];
  });
}

const solidityTests = readSolidityTests(join(root, "pkg/contracts/test")).join(
  "\n",
);
const accepted = [
  ...history.matchAll(
    /^\| \[(GHSA-[\w-]+)\]\([^\n]+?\) \| (Eligible[^|]*|Partially eligible[^|]*) \|/gm,
  ),
].map((match) => match[1]);
const rows = new Map();
for (const match of coverage.matchAll(
  /^\| (GHSA-[\w-]+)[^|]* \| ([^\n]+) \|$/gm,
)) {
  rows.set(match[1], `${rows.get(match[1]) ?? ""} ${match[2]}`);
}
const errors = [];
const testOwners = new Map();

function checkExactReference(label, reference) {
  const separator = reference.indexOf("::");
  if (separator < 0) {
    errors.push(`${label}: invalid reference ${reference}`);
    return;
  }
  const path = reference.slice(0, separator);
  const test = reference.slice(separator + 2);
  if (
    !path.startsWith("pkg/contracts/test/") &&
    !path.startsWith("apps/web/")
  ) {
    errors.push(`${label}: test path is outside a test suite: ${path}`);
    return;
  }
  let source;
  try {
    source = readFileSync(join(root, path), "utf8");
  } catch {
    errors.push(`${label}: missing test file ${path}`);
    return;
  }
  const exists = path.endsWith(".t.sol")
    ? source.includes(`function ${test}(`)
    : source.includes(`it("${test}"`) ||
      source.includes(`it('${test}'`) ||
      source.includes(`test("${test}"`) ||
      source.includes(`test('${test}'`);
  if (!exists) errors.push(`${label}: missing runnable test ${reference}`);
}

for (const id of accepted) {
  const row = rows.get(id);
  if (!row) {
    errors.push(`${id}: no regression test mapped`);
    continue;
  }
  const testNames = [...row.matchAll(/test[A-Za-z0-9_]+/g)].map(
    (match) => match[0],
  );
  for (const name of testNames) {
    if (!solidityTests.includes(`function ${name}(`))
      errors.push(`${id}: missing ${name}`);
    const owners = testOwners.get(name) ?? new Set();
    owners.add(id);
    testOwners.set(name, owners);
  }
  if (testNames.length === 0) {
    const webTest = row.match(/(apps\/web\/[^:`]+\.test\.ts)::([^`]+)/);
    if (
      !webTest ||
      !readFileSync(join(root, webTest[1]), "utf8").includes(webTest[2])
    ) {
      errors.push(`${id}: no runnable regression test found`);
    }
  }
}

for (const [name, owners] of testOwners) {
  if (
    owners.size > 1 &&
    !(
      name ===
        "test_GDN02_DeactivatePointsPreservesConvictionFromOldTotalStake" &&
      [...owners].sort().join(",") === "GHSA-94f2-r637-wcpv,GHSA-f2mf-mf7h-6jqv"
    )
  ) {
    errors.push(
      `${name}: shared by distinct accepted advisory entries ${[...owners].join(", ")}`,
    );
  }
}

const expectedFindings = Array.from(
  { length: 9 },
  (_, index) => `F${String(index + 1).padStart(2, "0")}`,
);
const mappedFindings = new Set();
const remediationTestOwners = new Map();
for (const entry of remediation) {
  if (mappedFindings.has(entry.finding))
    errors.push(`${entry.finding}: duplicate remediation mapping`);
  mappedFindings.add(entry.finding);
  if (!Array.isArray(entry.tests) || entry.tests.length === 0) {
    errors.push(`${entry.finding}: no anti-regression test mapped`);
    continue;
  }
  for (const reference of entry.tests) {
    checkExactReference(entry.finding, reference);
    const owner = remediationTestOwners.get(reference);
    if (owner && owner !== entry.finding) {
      errors.push(`${reference}: shared by ${owner} and ${entry.finding}`);
    }
    remediationTestOwners.set(reference, entry.finding);
  }
}
for (const finding of expectedFindings) {
  if (!mappedFindings.has(finding))
    errors.push(`${finding}: no remediation mapping`);
}

if (errors.length > 0) {
  for (const error of errors) console.error(error);
  process.exitCode = 1;
} else {
  console.log(
    `Verified regression coverage for ${accepted.length} accepted advisory entries and ${expectedFindings.length} private remediation findings.`,
  );
}
