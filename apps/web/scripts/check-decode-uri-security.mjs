// npm audit cannot see the pnpm backport on the CommonJS version used by WalletConnect.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));
const listing = spawnSync(
  "pnpm",
  [
    "--recursive",
    "list",
    "decode-uri-component",
    "--depth",
    "Infinity",
    "--json",
  ],
  { cwd: repoRoot, encoding: "utf8", maxBuffer: 20 * 1024 * 1024 },
);
assert.equal(
  listing.status,
  0,
  listing.stderr || "Cannot inspect installed dependencies",
);

const packages = new Map();
function collect(node) {
  if (node.from === "decode-uri-component") {
    assert.ok(node.path, "decode-uri-component is not installed");
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
assert.ok(packages.size > 0, "No installed decode-uri-component found");

let checked = 0;
for (const [directory, version] of packages) {
  if (version !== "0.2.2") continue;
  const source = readFileSync(path.join(directory, "index.js"), "utf8");
  assert.ok(
    source.includes("input.replace(multiMatcher, run => decode(run))") &&
      !source.includes("replaceMap"),
    "Installed decode-uri-component lacks the single-pass security backport",
  );
  const decode = createRequire(path.join(directory, "package.json"))(
    "./index.js",
  );
  assert.equal(decode("%C3%A9+garden"), "é garden");
  assert.equal(decode("%zz%FE%FF"), "%zz��");

  let payload = "";
  for (let i = 0; i < 32000; i++) {
    payload += `%${Math.floor(i / 256)
      .toString(16)
      .padStart(2, "0")}%${(i % 256).toString(16).padStart(2, "0")}x`;
  }
  payload += "%zz";
  const started = performance.now();
  decode(payload);
  assert.ok(
    performance.now() - started < 2000,
    "Installed decode-uri-component still has quadratic decoding",
  );
  checked++;
  console.log(`Verified decode-uri-component ${version} security backport.`);
}
assert.ok(checked > 0, "No patched decode-uri-component copy was checked");
