import { createHash, webcrypto } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  activationOperationId,
  checkActivation,
  clearPendingActivation,
  parseActivationOperation,
  readPendingActivation,
  submitActivation,
} from "./markeeActivation";
const community = "0x215b9ed0182d200563921f46ecbcb86111e9ad6b";
const signature = `0x${"11".repeat(65)}` as const;
const hash = `0x${"aa".repeat(32)}`;
const id = createHash("sha256")
  .update(`community/activate:123:${signature}`)
  .digest("hex");

describe("activation submission and recovery", () => {
  const fetchMock = vi.fn();
  let storage: Map<string, string>;
  beforeEach(() => {
    storage = new Map();
    fetchMock.mockReset();
    vi.stubGlobal("crypto", webcrypto);
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
        removeItem: (key: string) => storage.delete(key),
      },
    });
  });
  afterEach(() => vi.unstubAllGlobals());
  it("uses the same operation ID as Markee's deployed API", async () => {
    expect(await activationOperationId("123", signature)).toBe(id);
  });
  it("persists recovery before sending and preserves submitted hashes", async () => {
    fetchMock.mockImplementation(async () => {
      expect(readPendingActivation(42220, community)?.id).toBe(id);
      return Response.json({
        operation: {
          id,
          status: "submitted",
          result: { transactionHash: hash },
        },
      });
    });
    const op = await submitActivation(42220, community, "123", signature);
    expect(op.status).toBe("submitted");
    expect(op.result?.transactionHash).toBe(hash);
    expect(readPendingActivation(42220, community)?.id).toBe(id);
    await expect(
      submitActivation(42220, community, "123", signature),
    ).rejects.toThrow("already pending");
    expect(fetchMock).toHaveBeenCalledOnce();
  });
  it("recovers after a lost POST response by reading status only", async () => {
    fetchMock.mockRejectedValueOnce(new Error("connection lost"));
    await expect(
      submitActivation(42220, community, "123", signature),
    ).rejects.toThrow();
    const pending = readPendingActivation(42220, community)!;
    fetchMock.mockResolvedValue(
      Response.json({
        id,
        status: "complete",
        result: { transactionHash: hash },
      }),
    );
    expect((await checkActivation(pending)).status).toBe("complete");
    expect(fetchMock.mock.calls[1][1].method).toBeUndefined();
    expect(
      fetchMock.mock.calls.filter(([, options]) => options.method === "POST"),
    ).toHaveLength(1);
    clearPendingActivation(42220, community);
    expect(readPendingActivation(42220, community)).toBeNull();
  });
  it("does not submit if durable browser recovery cannot be saved", async () => {
    window.localStorage.setItem = () => {
      throw new Error("storage full");
    };
    await expect(
      submitActivation(42220, community, "123", signature),
    ).rejects.toThrow("storage full");
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it.each([502, 503])("retains recovery on HTTP %s", async (status) => {
    fetchMock.mockResolvedValue(
      Response.json({ error: "upstream unavailable" }, { status }),
    );
    await expect(
      submitActivation(42220, community, "123", signature),
    ).rejects.toThrow();
    expect(readPendingActivation(42220, community)?.id).toBe(id);
  });
  it("clears recovery for an explicit rejection before execution", async () => {
    fetchMock.mockResolvedValue(
      Response.json({ error: "keeper busy" }, { status: 409 }),
    );
    await expect(
      submitActivation(42220, community, "123", signature),
    ).rejects.toThrow("keeper busy");
    expect(readPendingActivation(42220, community)).toBeNull();
  });
  it("does not reinterpret a working operation as confirmed", () => {
    expect(parseActivationOperation({ id, status: "working" }, id).status).toBe(
      "working",
    );
  });
  it("rejects a different operation or a confirmation without a receipt hash", () => {
    expect(() =>
      parseActivationOperation({ id: "b".repeat(64), status: "working" }, id),
    ).toThrow();
    expect(() =>
      parseActivationOperation({ id, status: "complete" }, id),
    ).toThrow();
  });
});
