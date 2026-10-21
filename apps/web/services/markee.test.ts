import { afterEach, expect, it, vi } from "vitest";
import { fetchMarkeeJson } from "./markee";

afterEach(() => vi.unstubAllGlobals());

it("preserves route error details and disables retries", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          error: "No delivery route",
          code: "BRIDGE_ROUTE_UNAVAILABLE",
          retryable: false,
        }),
        { status: 409 },
      ),
    ),
  );
  await expect(fetchMarkeeJson("/quote")).rejects.toMatchObject({
    message: "No delivery route",
    status: 409,
    code: "BRIDGE_ROUTE_UNAVAILABLE",
    retryable: false,
  });
});

it.each([
  [400, false],
  [409, false],
  [429, true],
  [502, true],
])("classifies legacy HTTP %s responses", async (status, retryable) => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ error: "Unavailable" }), { status }),
      ),
  );
  await expect(fetchMarkeeJson("/quote")).rejects.toMatchObject({
    status,
    retryable,
  });
});
