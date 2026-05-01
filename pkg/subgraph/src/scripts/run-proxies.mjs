#!/usr/bin/env node
/**
 * run-proxies.mjs <network1> [network2] ...
 *
 * Runs list-proxies.cjs for each supplied network sequentially.
 * A failure on one chain is logged but does NOT abort the remaining chains.
 * Exits 1 if any chain failed, 0 if all succeeded.
 */

import { spawnSync } from "child_process";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const script = path.join(__dirname, "list-proxies.cjs");

const networks = process.argv.slice(2).filter((arg) => arg !== "--");

if (networks.length === 0) {
  console.error("Usage: run-proxies.mjs <network1> [network2] ...");
  process.exit(1);
}

let failed = 0;

for (const network of networks) {
  console.log(`\n[INFO] Running list-proxies for: ${network}`);
  const result = spawnSync(process.execPath, [script, network], {
    stdio: "inherit",
  });

  if (result.status === 0) {
    console.log(`✅ ${network}: success`);
  } else {
    console.error(`❌ ${network}: failed (exit ${result.status ?? "signal"})`);
    failed++;
  }
}

if (failed > 0) {
  console.error(`\n${failed} network(s) failed.`);
  process.exit(1);
} else {
  console.log("\nAll networks succeeded.");
}
