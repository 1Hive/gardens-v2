import { describe, expect, it, vi } from "vitest";

import {
  createNotionRequestRunner,
  getNotionRetryAfterMs,
  isNotionRateLimitError,
} from "./notion-rate-limit";

describe("Notion request rate limiting", () => {
  it("recognizes rate limits and parses Retry-After guidance", () => {
    const error = {
      code: "rate_limited",
      status: 429,
      headers: new Headers(),
      body: JSON.stringify({ additional_data: { retry_after: "24" } }),
    };

    expect(isNotionRateLimitError(error)).toBe(true);
    expect(getNotionRetryAfterMs(error)).toBe(24_000);
  });

  it("serializes requests and spaces their start times", async () => {
    let now = 0;
    let active = 0;
    let maxActive = 0;
    const starts: number[] = [];
    const sleep = vi.fn(async (ms: number) => {
      now += ms;
    });
    const run = createNotionRequestRunner({
      minIntervalMs: 400,
      sleep,
      now: () => now,
      random: () => 0,
    });

    const requests = [1, 2, 3].map((value) =>
      run(`request-${value}`, async () => {
        starts.push(now);
        active += 1;
        maxActive = Math.max(maxActive, active);
        active -= 1;
        return value;
      }),
    );

    await expect(Promise.all(requests)).resolves.toEqual([1, 2, 3]);
    expect(starts).toEqual([0, 400, 800]);
    expect(maxActive).toBe(1);
  });

  it("retries the same request after the server Retry-After delay", async () => {
    let now = 0;
    const sleep = vi.fn(async (ms: number) => {
      now += ms;
    });
    const onRetry = vi.fn();
    const request = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce({
        status: 429,
        additional_data: { retry_after: "2" },
      })
      .mockResolvedValue("ok");
    const run = createNotionRequestRunner({
      minIntervalMs: 400,
      maxRetries: 2,
      sleep,
      now: () => now,
      random: () => 0,
      onRetry,
    });

    await expect(run("update page", request)).resolves.toBe("ok");
    expect(request).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledWith(2_000);
    expect(onRetry).toHaveBeenCalledWith(
      expect.objectContaining({
        operation: "update page",
        attempt: 1,
        delayMs: 2_000,
      }),
    );
  });

  it("does not retry permanent errors", async () => {
    const request = vi.fn(async () => {
      throw new Error("validation failed");
    });
    const run = createNotionRequestRunner({
      sleep: vi.fn(),
      random: () => 0,
    });

    await expect(run("update page", request)).rejects.toThrow(
      "validation failed",
    );
    expect(request).toHaveBeenCalledOnce();
  });
});
