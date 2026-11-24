import { createHash, webcrypto } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  checkClaimOperation,
  claimOperationId,
  readPendingClaimOperation,
  submitClaimOperation,
} from "./markeeClaimOperation";

const chainId = 100;
const community = "0x0000000000000000000000000000000000000001";
const signature = `0x${"11".repeat(65)}` as const;
const nonce = "123";
const items = new Map<string, string>();

beforeEach(() => {
  items.clear();
  vi.restoreAllMocks();
  vi.stubGlobal("crypto", webcrypto);
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (key: string) => items.get(key) ?? null,
      setItem: (key: string, value: string) => items.set(key, value),
      removeItem: (key: string) => items.delete(key),
    },
  });
});

describe("Markee claim operation recovery", () => {
  it("uses the same deterministic operation ID as Markee", async () => {
    expect(await claimOperationId(nonce, signature)).toBe(
      createHash("sha256")
        .update(`community/claim:${nonce}:${signature}`)
        .digest("hex"),
    );
  });

  it("persists before submitting and blocks a duplicate signed POST", async () => {
    const id = await claimOperationId(nonce, signature);
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async () => {
        expect(readPendingClaimOperation(chainId, community)?.id).toBe(id);
        return Response.json({ id, status: "working" });
      });
    expect(
      (await submitClaimOperation(chainId, community, nonce, signature)).status,
    ).toBe("working");
    await expect(
      submitClaimOperation(chainId, community, nonce, signature),
    ).rejects.toThrow("already pending");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("preserves a timed-out operation for status recovery", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("timeout"));
    await expect(
      submitClaimOperation(chainId, community, nonce, signature),
    ).rejects.toThrow("timeout");
    const pending = readPendingClaimOperation(chainId, community);
    expect(pending).not.toBeNull();
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      Response.json({ id: pending!.id, status: "submitted" }),
    );
    expect((await checkClaimOperation(pending!)).status).toBe("submitted");
  });

  it("clears a rejected request that Markee could not execute", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({ error: "Invalid signature" }, { status: 401 }),
    );
    await expect(
      submitClaimOperation(chainId, community, nonce, signature),
    ).rejects.toThrow("Invalid signature");
    expect(readPendingClaimOperation(chainId, community)).toBeNull();
  });
});
