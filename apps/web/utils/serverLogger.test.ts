import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { logger, withServerErrorLogging } from "./serverLogger";

const originalVercelEnv = process.env.VERCEL_ENV;
const originalGardensEnv = process.env.NEXT_PUBLIC_ENV_GARDENS;
const originalWebhook = process.env.DISCORD_ERROR_WEBHOOK_URL;

describe("serverLogger", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.stubGlobal("fetch", vi.fn());
    delete process.env.VERCEL_ENV;
    delete process.env.NEXT_PUBLIC_ENV_GARDENS;
    process.env.DISCORD_ERROR_WEBHOOK_URL = "https://discord.test/webhook";
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    process.env.VERCEL_ENV = originalVercelEnv;
    process.env.NEXT_PUBLIC_ENV_GARDENS = originalGardensEnv;
    process.env.DISCORD_ERROR_WEBHOOK_URL = originalWebhook;
  });

  it("does not call Discord outside production", async () => {
    await expect(logger.error(new Error("test"))).resolves.toEqual({
      status: "skipped",
      reason: "not-production",
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("sends redacted errors to Discord in production", async () => {
    process.env.VERCEL_ENV = "production";
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 204 }));

    await expect(
      logger.error(new Error("test failure"), {
        route: "/api/test",
        authorization: "Bearer secret",
      }),
    ).resolves.toEqual({ status: "sent" });

    const init = vi.mocked(fetch).mock.calls[0]?.[1];
    const body = JSON.parse(String(init?.body));
    expect(body.embeds[0].description).toContain("test failure");
    expect(body.embeds[0].fields[0].value).toContain("[redacted]");
    expect(body.embeds[0].fields[0].value).not.toContain("Bearer secret");
  });

  it("logs and rethrows errors from wrapped server handlers", async () => {
    process.env.VERCEL_ENV = "production";
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 204 }));
    const error = new Error("wrapped failure");
    const wrapped = withServerErrorLogging(
      async () => {
        throw error;
      },
      { job: "test" },
    );

    await expect(wrapped()).rejects.toBe(error);
    expect(fetch).toHaveBeenCalledOnce();
  });
});
