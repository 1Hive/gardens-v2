import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MarkeeApiError } from "../services/markee";
import { pollMarkeeClaimQuote } from "./pollMarkeeClaimQuote";

vi.mock("@/services/markee", async () => import("../services/markee"));

describe("claim quote polling", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("stops after a known unavailable route and reports the error immediately", async () => {
    const error = new MarkeeApiError("No delivery route", 409, false);
    const load = vi.fn().mockRejectedValue(error);
    const onError = vi.fn();
    const controller = new AbortController();
    pollMarkeeClaimQuote({ load, onError, signal: controller.signal });
    await vi.advanceTimersByTimeAsync(300_000);
    expect(load).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(error);
    controller.abort();
  });

  it("backs off transient errors at 15, 30, 60 seconds then stops", async () => {
    const load = vi
      .fn()
      .mockRejectedValue(new MarkeeApiError("Timeout", 502, true));
    const controller = new AbortController();
    pollMarkeeClaimQuote({ load, onError: vi.fn(), signal: controller.signal });
    await vi.advanceTimersByTimeAsync(14_999);
    expect(load).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(load).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(30_000);
    expect(load).toHaveBeenCalledTimes(3);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(load).toHaveBeenCalledTimes(4);
    await vi.advanceTimersByTimeAsync(600_000);
    expect(load).toHaveBeenCalledTimes(4);
    controller.abort();
  });

  it("does not overlap slow requests or publish errors after closing", async () => {
    let reject!: (reason: Error) => void;
    const load = vi.fn(
      () =>
        new Promise<{ expiresAt: number }>((_, fail) => {
          reject = fail;
        }),
    );
    const onError = vi.fn();
    const controller = new AbortController();
    pollMarkeeClaimQuote({ load, onError, signal: controller.signal });
    await vi.advanceTimersByTimeAsync(300_000);
    expect(load).toHaveBeenCalledTimes(1);
    controller.abort();
    reject(new Error("Aborted"));
    await vi.advanceTimersByTimeAsync(300_000);
    expect(onError).not.toHaveBeenCalled();
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("refreshes successful quotes at expiry and cancels the timer on close", async () => {
    const load = vi.fn(async () => ({ expiresAt: Date.now() / 1000 + 180 }));
    const controller = new AbortController();
    pollMarkeeClaimQuote({ load, onError: vi.fn(), signal: controller.signal });
    await vi.advanceTimersByTimeAsync(179_999);
    expect(load).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(load).toHaveBeenCalledTimes(2);
    controller.abort();
    await vi.advanceTimersByTimeAsync(300_000);
    expect(load).toHaveBeenCalledTimes(2);
  });
});
