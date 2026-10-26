import { describe, expect, it, vi } from "vitest";

import {
  createNotionRequestRunner,
  getNotionRetryAfterMs,
  isNotionRateLimitError,
  isNotionTransientError,
  NotionRequestBudgetExceededError,
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

  it.each([500, 502, 503, 504])(
    "retries transient HTTP %s for safe operations",
    async (status) => {
      let now = 0;
      const sleep = vi.fn(async (ms: number) => {
        now += ms;
      });
      const request = vi
        .fn<() => Promise<string>>()
        .mockRejectedValueOnce({
          status,
          code: "notionhq_client_response_error",
          body: "<html>Bad Gateway</html>",
        })
        .mockResolvedValue("ok");
      const run = createNotionRequestRunner({
        sleep,
        now: () => now,
        random: () => 0,
      });

      await expect(
        run("update wallet page", request, { retryTransient: true }),
      ).resolves.toBe("ok");
      expect(request).toHaveBeenCalledTimes(2);
      expect(sleep).toHaveBeenCalledWith(1_000);
    },
  );

  it.each([400, 401, 403, 404, 409, 501])(
    "does not retry non-transient HTTP %s",
    async (status) => {
      const error = { status, code: "validation_error" };
      const request = vi.fn().mockRejectedValue(error);
      const run = createNotionRequestRunner({ sleep: vi.fn() });
      expect(isNotionTransientError(error)).toBe(false);
      await expect(
        run("update page", request, { retryTransient: true }),
      ).rejects.toBe(error);
      expect(request).toHaveBeenCalledOnce();
    },
  );

  it("does not blindly retry ambiguous page creation failures", async () => {
    const error = { status: 502 };
    const request = vi.fn().mockRejectedValue(error);
    const run = createNotionRequestRunner({ sleep: vi.fn() });
    await expect(run("create wallet page", request)).rejects.toBe(error);
    expect(request).toHaveBeenCalledOnce();
  });

  it("still retries rejected rate-limited page creates", async () => {
    let now = 0;
    const request = vi
      .fn()
      .mockRejectedValueOnce({ status: 429 })
      .mockResolvedValue("created");
    const run = createNotionRequestRunner({
      sleep: async (ms) => {
        now += ms;
      },
      now: () => now,
      random: () => 0,
    });
    await expect(
      run("create wallet page", request, { retryTransient: false }),
    ).resolves.toBe("created");
    expect(request).toHaveBeenCalledTimes(2);
  });

  it("bounds transient retries with exponential backoff and preserves the final error", async () => {
    let now = 0;
    const error = { status: 502 };
    const sleep = vi.fn(async (ms: number) => {
      now += ms;
    });
    const request = vi.fn().mockRejectedValue(error);
    const run = createNotionRequestRunner({
      sleep,
      now: () => now,
      random: () => 0,
    });
    await expect(
      run("query data source", request, { retryTransient: true }),
    ).rejects.toBe(error);
    expect(request).toHaveBeenCalledTimes(4);
    expect(sleep.mock.calls.map(([ms]) => ms)).toEqual([1_000, 2_000, 4_000]);
  });

  it("does not reset the retry limit when error types change", async () => {
    let now = 0;
    const error = { status: 502 };
    const request = vi
      .fn()
      .mockRejectedValueOnce({ status: 429 })
      .mockRejectedValue(error);
    const run = createNotionRequestRunner({
      sleep: async (ms) => {
        now += ms;
      },
      now: () => now,
      random: () => 0,
    });
    await expect(
      run("query data source", request, { retryTransient: true }),
    ).rejects.toBe(error);
    expect(request).toHaveBeenCalledTimes(4);
  });

  it("does not shorten Retry-After when it exceeds the retry budget", async () => {
    const error = { status: 503, headers: { "Retry-After": "120" } };
    const sleep = vi.fn();
    const request = vi.fn().mockRejectedValue(error);
    const run = createNotionRequestRunner({
      sleep,
      now: () => 0,
      random: () => 0,
    });
    await expect(
      run("query data source", request, { retryTransient: true }),
    ).rejects.toBe(error);
    expect(request).toHaveBeenCalledOnce();
    expect(sleep).not.toHaveBeenCalled();
  });

  it("counts request duration as well as backoff against the retry budget", async () => {
    let now = 0;
    const error = Object.assign(new Error("Bad Gateway"), { status: 502 });
    const request = vi.fn(async () => {
      now += 59_500;
      throw error;
    });
    const sleep = vi.fn();
    const run = createNotionRequestRunner({
      sleep,
      now: () => now,
      random: () => 0,
    });
    await expect(
      run("query data source", request, { retryTransient: true }),
    ).rejects.toBe(error);
    expect(request).toHaveBeenCalledOnce();
    expect(sleep).not.toHaveBeenCalled();
  });

  it("reserves a request timeout before sleeping for another attempt", async () => {
    const sleep = vi.fn();
    const request = vi.fn().mockRejectedValue({ status: 502 });
    const run = createNotionRequestRunner({
      sleep,
      now: () => 0,
      random: () => 0,
    });
    await expect(
      run("update page", request, {
        retryTransient: true,
        deadlineMs: 60_500,
        requestTimeoutMs: 60_000,
      }),
    ).rejects.toMatchObject({
      code: "notion_sync_budget_exceeded",
      requestAttempted: true,
    });
    expect(request).toHaveBeenCalledOnce();
    expect(sleep).not.toHaveBeenCalled();
  });

  it("checks deadlines after queueing and leaves the queue usable after rejection", async () => {
    let now = 0;
    const run = createNotionRequestRunner({
      sleep: async (ms) => {
        now += ms;
      },
      now: () => now,
      random: () => 0,
    });
    const expiredRequest = vi.fn();
    const first = run("slow query", async () => {
      now = 1_000;
      return "first";
    });
    const expired = run("update page", expiredRequest, { deadlineMs: 1_000 });
    const after = run("next query", async () => "after");
    await expect(first).resolves.toBe("first");
    await expect(expired).rejects.toBeInstanceOf(
      NotionRequestBudgetExceededError,
    );
    await expect(after).resolves.toBe("after");
    expect(expiredRequest).not.toHaveBeenCalled();
  });

  it("rechecks the deadline when a sleep takes longer than expected", async () => {
    let now = 0;
    const request = vi.fn().mockRejectedValue({ status: 502 });
    const run = createNotionRequestRunner({
      sleep: async () => {
        now = 5_000;
      },
      now: () => now,
      random: () => 0,
    });
    await expect(
      run("update page", request, { retryTransient: true, deadlineMs: 3_000 }),
    ).rejects.toBeInstanceOf(NotionRequestBudgetExceededError);
    expect(request).toHaveBeenCalledOnce();
  });
});
