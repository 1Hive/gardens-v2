import { NextRequest } from "next/server";
import { afterEach, expect, it, vi } from "vitest";
const run = vi.hoisted(() => vi.fn());
vi.mock("@/services/markeeDeliveryKeeper", () => ({
  runMarkeeDeliveryKeeper: run,
}));
import { GET } from "./route";
afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetAllMocks();
});
it("rejects unauthenticated calls without running the keeper", async () => {
  vi.stubEnv("CRON_SECRET", "test-secret");
  const response = await GET(
    new NextRequest("https://example.test/api/markee/claim/deliver"),
  );
  expect(response.status).toBe(401);
  expect(run).not.toHaveBeenCalled();
});
it("fails closed if the cron secret is missing", async () => {
  vi.stubEnv("CRON_SECRET", "");
  expect(
    (
      await GET(
        new NextRequest("https://example.test/api/markee/claim/deliver"),
      )
    ).status,
  ).toBe(401);
  expect(run).not.toHaveBeenCalled();
});
it("runs authenticated requests with no caching", async () => {
  vi.stubEnv("CRON_SECRET", "test-secret");
  run.mockResolvedValue({ status: "disabled", deliveries: [] });
  const response = await GET(
    new NextRequest("https://example.test/api/markee/claim/deliver", {
      headers: { authorization: "Bearer test-secret" },
    }),
  );
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(run).toHaveBeenCalledOnce();
});
