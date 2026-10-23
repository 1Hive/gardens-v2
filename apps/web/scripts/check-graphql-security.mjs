// Verify the installed packages, not the unpatched npm audit model. The security
// backports retain the GraphQL 16 API used by Mesh's older executor/delegate.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));
const listing = spawnSync(
  "pnpm",
  [
    "--recursive",
    "list",
    "@graphql-tools/utils",
    "--depth",
    "Infinity",
    "--json",
  ],
  { cwd: repoRoot, encoding: "utf8", maxBuffer: 20 * 1024 * 1024 },
);
assert.equal(
  listing.status,
  0,
  listing.stderr || "Cannot inspect installed GraphQL dependencies",
);
const packages = new Map();
function collect(node) {
  if (node.from === "@graphql-tools/utils") {
    assert.ok(node.path, "GraphQL dependency is not installed");
    packages.set(node.path, node.version);
  }
  for (const kind of [
    "dependencies",
    "devDependencies",
    "optionalDependencies",
  ]) {
    for (const dependency of Object.values(node[kind] ?? {}))
      collect(dependency);
  }
}
JSON.parse(listing.stdout).forEach(collect);
assert.ok(
  packages.size > 0,
  "No installed GraphQL utils found; cannot validate audit exception",
);

const probe = "__gardensGraphqlSecurityProbe__";
function assertClean() {
  assert.equal(
    Object.hasOwn(Object.prototype, probe),
    false,
    "Object prototype was modified",
  );
  assert.equal(
    Object.hasOwn(Function.prototype, probe),
    false,
    "Function prototype was modified",
  );
}
function verifySecurity(utils) {
  const merge = (executionResult, incrementalResult) => {
    try {
      utils.mergeIncrementalResult({ executionResult, incrementalResult });
      assertClean();
    } finally {
      // Keep a failing negative-control run isolated from subsequent checks.
      delete Object.prototype[probe];
      delete Function.prototype[probe];
    }
  };
  for (const key of ["__proto__", "constructor", "prototype"]) {
    for (const segment of [[key], { toString: () => key }, key]) {
      merge({ data: {} }, { path: [segment, probe], data: { blocked: true } });
      const result = { data: {} };
      merge(result, { path: [segment], data: { [probe]: true } });
      assert.deepEqual(result, { data: {} });
      const late = { data: {} };
      merge(late, { path: ["unused", segment], data: { [probe]: true } });
      assert.deepEqual(
        late,
        { data: {} },
        "Invalid paths must not create partial parents",
      );
      const items = { data: {} };
      merge(items, {
        path: [segment],
        items: [{ [probe]: true }, { [probe]: true }],
      });
      assert.deepEqual(
        items,
        { data: {} },
        "Invalid item paths must not turn into NaN writes",
      );
    }
  }
  for (const segment of [null, undefined, true, Symbol("invalid")]) {
    const result = { data: {} };
    merge(result, { path: [segment], data: { [probe]: true } });
    assert.deepEqual(result, { data: {} });
  }
  const payload = JSON.parse(`{"constructor":{"__proto__":{"${probe}":true}}}`);
  merge({ data: {} }, { path: [], data: payload });
  merge({ extensions: {} }, { extensions: payload });
  const nested = { data: {} };
  merge(nested, {
    incremental: [{ path: [["__proto__"]], data: { [probe]: true } }],
  });
  assert.deepEqual(nested, { data: {} });
  const inherited = { [probe]: false };
  const own = { data: Object.create({ inherited }) };
  merge(own, { path: ["inherited"], data: { [probe]: true } });
  assert.equal(
    inherited[probe],
    false,
    "Inherited objects must not become write targets",
  );
  assert.equal(Object.hasOwn(own.data, "inherited"), true);

  const valid = { data: { users: [{ id: "1" }] }, extensions: { first: true } };
  merge(valid, { path: ["users", 0], data: { name: "Garden" } });
  merge(valid, { path: ["users", 1], items: [{ id: "2" }, { id: "3" }] });
  merge(valid, {
    extensions: { second: true },
    errors: [{ message: "partial result" }],
  });
  assert.deepEqual(valid, {
    data: { users: [{ id: "1", name: "Garden" }, { id: "2" }, { id: "3" }] },
    extensions: { first: true, second: true },
    errors: [{ message: "partial result" }],
  });
}

function verifyGraphql16Compatibility(utils, graphql) {
  // Raw variables (including these perfectly valid names) are required by the
  // installed pre-v12 GraphQL Tools consumers. A blanket v12 override breaks it.
  const schema = graphql.buildSchema("type Query { value: String }");
  for (const variable of ["visible", "coerced", "sources"]) {
    for (const flag of [true, false]) {
      const document = graphql.parse(
        `query($${variable}: Boolean!) { included: value @include(if: $${variable}) skipped: value @skip(if: $${variable}) }`,
      );
      const { fields } = utils.collectFields(
        schema,
        {},
        { [variable]: flag },
        schema.getQueryType(),
        document.definitions[0].selectionSet,
      );
      assert.deepEqual([...fields.keys()], [flag ? "included" : "skipped"]);
    }
  }
}

let checked = 0;
for (const [directory, version] of packages) {
  const match = /^(\d+)\.(\d+)\.(\d+)(?:\D|$)/.exec(version);
  assert.ok(match, `Unrecognized GraphQL utils version: ${version}`);
  const [, major, minor, patch] = match.map(Number);
  // mergeIncrementalResult was added in 10.10.1. Older API lines are outside
  // this advisory and intentionally remain untouched.
  if (
    major < 10 ||
    (major === 10 && (minor < 10 || (minor === 10 && patch < 1)))
  )
    continue;
  const require = createRequire(path.join(directory, "package.json"));
  const graphql = require("graphql");
  for (const variant of ["cjs", "esm"]) {
    const entry = path.join(directory, variant, "index.js");
    const utils =
      variant === "cjs" ?
        require(entry)
      : await import(pathToFileURL(entry).href);
    verifySecurity(utils);
    if (graphql.versionInfo.major === 16)
      verifyGraphql16Compatibility(utils, graphql);
    checked++;
  }
  console.log(
    `Verified GraphQL utils ${version}: CJS/ESM security and compatible query behavior.`,
  );
}
assert.ok(checked > 0, "No relevant installed GraphQL utils were verified");
