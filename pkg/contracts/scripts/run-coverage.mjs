import { spawnSync } from "node:child_process";
import {
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const contractsDir = path.resolve(scriptDir, "..");
const repoRoot = path.resolve(contractsDir, "../..");
const testDir = path.join(contractsDir, "test");
const batchSize = Number.parseInt(process.env.COVERAGE_BATCH_SIZE ?? "8", 10);

if (!Number.isInteger(batchSize) || batchSize < 1) {
  throw new Error("COVERAGE_BATCH_SIZE must be a positive integer");
}

const walk = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(entryPath)));
    else if (entry.isFile()) files.push(entryPath);
  }
  return files;
};

const linkFile = async (source, destination) => {
  await mkdir(path.dirname(destination), { recursive: true });
  await symlink(source, destination, "file");
};

const addCount = (map, key, count) => {
  map.set(key, (map.get(key) ?? 0) + count);
};

const mergeLcov = async (reports, tempRoot) => {
  const sources = new Map();
  const tempPrefix = `${path.relative(repoRoot, tempRoot).split(path.sep).join("/")}/`;

  for (const report of reports) {
    const records = (await readFile(report, "utf8")).split("end_of_record");
    for (const record of records) {
      const rows = record.split(/\r?\n/).filter(Boolean);
      const sourceRow = rows.find((row) => row.startsWith("SF:"));
      if (!sourceRow) continue;

      let source = sourceRow.slice(3).split(path.sep).join("/");
      if (source.startsWith(tempPrefix)) {
        source = source.slice(tempPrefix.length).replace(/^group-\d+\//, "");
      }
      source = source.replace(/^pkg\/contracts\//, "");

      const aggregate = sources.get(source) ?? {
        branches: new Map(),
        functions: new Map(),
        functionHits: new Map(),
        lines: new Map(),
      };

      for (const row of rows) {
        if (row.startsWith("FN:")) {
          const definition = row.slice(3);
          const separator = definition.indexOf(",");
          if (separator !== -1) {
            const name = definition.slice(separator + 1);
            aggregate.functions.set(
              `${definition.slice(0, separator)}:${name}`,
              definition,
            );
          }
        } else if (row.startsWith("FNDA:")) {
          const data = row.slice(5);
          const separator = data.indexOf(",");
          if (separator !== -1) {
            addCount(
              aggregate.functionHits,
              data.slice(separator + 1),
              Number.parseInt(data.slice(0, separator), 10),
            );
          }
        } else if (row.startsWith("DA:")) {
          const [line, hits] = row.slice(3).split(",");
          addCount(
            aggregate.lines,
            Number.parseInt(line, 10),
            Number.parseInt(hits, 10),
          );
        } else if (row.startsWith("BRDA:")) {
          const [line, block, branch, taken] = row.slice(5).split(",");
          const key = `${line},${block},${branch}`;
          const previous = aggregate.branches.get(key);
          const hits = taken === "-" ? null : Number.parseInt(taken, 10);
          aggregate.branches.set(
            key,
            previous == null ? hits : hits == null ? previous : previous + hits,
          );
        }
      }
      sources.set(source, aggregate);
    }
  }

  const output = [];
  for (const source of [...sources.keys()].sort()) {
    const aggregate = sources.get(source);
    output.push("TN:", `SF:${source}`);

    for (const definition of [...aggregate.functions.values()].sort(
      (left, right) => {
        const leftLine = Number.parseInt(left, 10);
        const rightLine = Number.parseInt(right, 10);
        return leftLine - rightLine || left.localeCompare(right);
      },
    )) {
      output.push(`FN:${definition}`);
    }
    for (const [name, hits] of [...aggregate.functionHits.entries()].sort(
      ([left], [right]) => left.localeCompare(right),
    )) {
      output.push(`FNDA:${hits},${name}`);
    }

    const functionNames = new Set(
      [...aggregate.functions.values()].map((definition) =>
        definition.slice(definition.indexOf(",") + 1),
      ),
    );
    output.push(`FNF:${functionNames.size}`);
    output.push(
      `FNH:${[...functionNames].filter((name) => (aggregate.functionHits.get(name) ?? 0) > 0).length}`,
    );

    for (const [line, hits] of [...aggregate.lines.entries()].sort(
      ([left], [right]) => left - right,
    )) {
      output.push(`DA:${line},${hits}`);
    }
    output.push(`LF:${aggregate.lines.size}`);
    output.push(
      `LH:${[...aggregate.lines.values()].filter((hits) => hits > 0).length}`,
    );

    for (const [branch, hits] of [...aggregate.branches.entries()].sort(
      ([left], [right]) => {
        const [leftLine] = left.split(",").map(Number);
        const [rightLine] = right.split(",").map(Number);
        return leftLine - rightLine || left.localeCompare(right);
      },
    )) {
      output.push(`BRDA:${branch},${hits == null ? "-" : hits}`);
    }
    output.push(`BRF:${aggregate.branches.size}`);
    output.push(
      `BRH:${[...aggregate.branches.values()].filter((hits) => hits != null && hits > 0).length}`,
    );
    output.push("end_of_record");
  }

  await writeFile(
    path.join(contractsDir, "lcov.info"),
    `${output.join("\n")}\n`,
  );
};

const allTestFiles = await walk(testDir);
const supportFiles = allTestFiles.filter(
  (file) => file.endsWith(".sol") && !file.endsWith(".t.sol"),
);
// DiamondUpgrade imports this test contract as a shared fixture, even though
// its own tests are excluded from coverage execution.
const importedTestSupport = path.join(testDir, "CVStrategyTest.t.sol");
const testFiles = allTestFiles
  .filter((file) => file.endsWith(".t.sol"))
  .filter((file) => {
    const relative = path.relative(testDir, file).split(path.sep);
    return !relative.includes("fork") && !relative.includes("no-coverage");
  })
  .sort();

const batches = [];
// Instrumenting the full suite in one solc invocation exceeds CI memory.
for (let index = 0; index < testFiles.length; index += batchSize) {
  batches.push(testFiles.slice(index, index + batchSize));
}

await mkdir(path.join(contractsDir, ".tmp"), { recursive: true });
const tempRoot = await mkdtemp(
  path.join(contractsDir, ".tmp", "coverage-run-"),
);
const reports = [];

try {
  for (const [index, batch] of batches.entries()) {
    const groupRoot = path.join(tempRoot, `group-${index}`);
    const groupTestDir = path.join(groupRoot, "test");
    const emptySourceDir = path.join(groupRoot, "empty-src");
    const emptyScriptDir = path.join(groupRoot, "empty-script");
    await mkdir(groupRoot, { recursive: true });
    await Promise.all([
      mkdir(groupTestDir, { recursive: true }),
      mkdir(emptySourceDir, { recursive: true }),
      mkdir(emptyScriptDir, { recursive: true }),
      symlink(
        path.join(contractsDir, "src"),
        path.join(groupRoot, "src"),
        "dir",
      ),
      symlink(
        path.join(contractsDir, "script"),
        path.join(groupRoot, "script"),
        "dir",
      ),
    ]);

    for (const source of new Set([
      ...supportFiles,
      importedTestSupport,
      ...batch,
    ])) {
      await linkFile(
        source,
        path.join(groupTestDir, path.relative(testDir, source)),
      );
    }

    const report = path.join(groupRoot, "lcov.info");
    reports.push(report);
    console.log(
      `Coverage batch ${index + 1}/${batches.length}: ${batch.length} test files`,
    );
    const result = spawnSync(
      "forge",
      [
        "coverage",
        "--use",
        "0.8.23",
        "--ir-minimum",
        "--no-match-contract",
        "^(CVStrategyTest|DiamondUpgradeTest)$",
        "--exclude-tests",
        "--report",
        "lcov",
        "--report-file",
        report,
      ],
      {
        cwd: repoRoot,
        env: {
          ...process.env,
          FOUNDRY_SCRIPT: emptyScriptDir,
          FOUNDRY_SRC: emptySourceDir,
          FOUNDRY_TEST: groupTestDir,
        },
        stdio: "inherit",
      },
    );
    if (result.error) throw result.error;
    if (result.status !== 0) process.exitCode = result.status ?? 1;
    if (process.exitCode) break;
  }

  if (!process.exitCode) await mergeLcov(reports, tempRoot);
} finally {
  await rm(tempRoot, { force: true, recursive: true });
}
