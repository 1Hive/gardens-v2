import assert from "node:assert/strict";
import test from "node:test";
import { hasPrivateAdvisoryAccess } from "./authorization.mjs";

test("published-only GitHub access cannot enter the private board", async () => {
  const paths = [];
  const allowed = await hasPrivateAdvisoryAccess("token", async (_, path) => {
    paths.push(path);
    return [];
  });
  assert.equal(allowed, false);
  assert.equal(paths.length, 3);
  assert(paths.every((path) => /state=(triage|draft|closed)/.test(path)));
});

test("access to a private draft allows sign-in", async () => {
  const allowed = await hasPrivateAdvisoryAccess("token", async (_, path) =>
    path.includes("state=draft") ? [{ ghsa_id: "GHSA-private" }] : []);
  assert.equal(allowed, true);
});

test("unexpected GitHub responses fail closed", async () => {
  await assert.rejects(
    hasPrivateAdvisoryAccess("token", async () => ({ message: "Not Found" })),
    /Unexpected GitHub advisory response/,
  );
});
