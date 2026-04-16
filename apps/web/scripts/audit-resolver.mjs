import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import {
  access,
  copyFile,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appDir = path.resolve(__dirname, "..");
const auditResolvePath = path.join(appDir, "audit-resolve.json");

const mode = process.argv[2];
const forwardedArgs = process.argv.slice(3);

if (mode !== "check" && mode !== "resolve") {
  console.error(
    "Usage: node ./scripts/audit-resolver.mjs <check|resolve> [audit args...]",
  );
  process.exit(1);
}

const binPath = require.resolve(
  mode === "check" ?
    "npm-audit-resolver/check.js"
  : "npm-audit-resolver/resolve.js",
);

const appPackage = JSON.parse(
  await readFile(path.join(appDir, "package.json"), "utf8"),
);

const sanitizedManifest = {
  name: `${appPackage.name}-audit`,
  version: appPackage.version,
  private: true,
  dependencies: appPackage.dependencies ?? {},
  optionalDependencies: appPackage.optionalDependencies ?? {},
  overrides: appPackage.overrides ?? {},
};

const tempDir = await mkdtemp(path.join(os.tmpdir(), "gardens-web-audit-"));

const run = ({ command, args, cwd, captureOutput = false }) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: captureOutput ? ["inherit", "pipe", "pipe"] : "inherit",
      env: process.env,
    });

    let stdout = "";
    let stderr = "";

    if (captureOutput) {
      child.stdout.on("data", (chunk) => {
        stdout += chunk.toString();
      });
      child.stderr.on("data", (chunk) => {
        stderr += chunk.toString();
      });
    }

    child.on("error", reject);
    child.on("close", (code) => resolve({ code: code ?? 1, stdout, stderr }));
  });

try {
  await writeFile(
    path.join(tempDir, "package.json"),
    `${JSON.stringify(sanitizedManifest, null, 2)}\n`,
  );

  try {
    await access(auditResolvePath);
    await copyFile(auditResolvePath, path.join(tempDir, "audit-resolve.json"));
  } catch {
    // No existing audit decisions yet.
  }

  const npmInstallResult = await run({
    command: "npm",
    args: [
      "install",
      "--package-lock-only",
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
    ],
    cwd: tempDir,
  });

  if (npmInstallResult.code !== 0) {
    process.exit(npmInstallResult.code);
  }

  let resolverExitCode = 0;

  if (mode === "check") {
    const checkArgs =
      forwardedArgs.includes("--json") ? forwardedArgs : (
        [...forwardedArgs, "--json"]
      );

    const result = await run({
      command: process.execPath,
      args: [binPath, ...checkArgs],
      cwd: tempDir,
      captureOutput: true,
    });

    if (result.stderr) {
      process.stderr.write(result.stderr);
    }

    const jsonStart = result.stdout.indexOf("[");
    const jsonEnd = result.stdout.lastIndexOf("]");

    if (jsonStart === -1 || jsonEnd === -1) {
      if (result.stdout) {
        process.stdout.write(result.stdout);
      }
      process.exit(result.code);
    }

    const advisories = JSON.parse(result.stdout.slice(jsonStart, jsonEnd + 1));
    const unresolved = advisories.filter(
      (item) =>
        ["high", "critical"].includes(item.severity) &&
        item.resolutions?.some((resolution) =>
          ["none", "expired"].includes(resolution.resolution),
        ),
    );

    if (unresolved.length > 0) {
      process.stderr.write("Unresolved high or critical advisories remain:\n");
      unresolved.forEach((item) => {
        process.stderr.write(
          `- [${item.severity}] ${item.name} (${item.id}): ${item.title}\n`,
        );
      });
      resolverExitCode = 1;
    } else {
      process.stdout.write(
        "No unresolved high or critical advisories in apps/web.\n",
      );
    }
  } else {
    const result = await run({
      command: process.execPath,
      args: [binPath, ...forwardedArgs],
      cwd: tempDir,
    });
    resolverExitCode = result.code;
  }

  try {
    await copyFile(path.join(tempDir, "audit-resolve.json"), auditResolvePath);
  } catch {
    // check-audit does not always emit the file.
  }

  process.exit(resolverExitCode);
} finally {
  await rm(tempDir, { recursive: true, force: true });
}
