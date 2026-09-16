import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearMarkeeChallengesForTests,
  consumeMarkeeChallenge,
  MarkeeChallengeRateLimitError,
  MarkeeChallengeStoreUnavailableError,
  reserveMarkeeChallengeIssue,
  saveMarkeeChallenge,
} from "./markeeChallengeStore";

const namespace = "test";

describe("Markee challenge store", () => {
  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("MARKEE_AUTH_REDIS_REST_URL", "");
    vi.stubEnv("MARKEE_AUTH_REDIS_REST_TOKEN", "");
    vi.stubEnv("KV_REST_API_URL", "");
    vi.stubEnv("KV_REST_API_TOKEN", "");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
    clearMarkeeChallengesForTests(namespace);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("atomically consumes an in-memory challenge once", async () => {
    await saveMarkeeChallenge({
      namespace,
      nonce: "1",
      ttlSeconds: 300,
      value: { amount: 42n },
    });

    await expect(
      consumeMarkeeChallenge<{ amount: bigint }>({ namespace, nonce: "1" }),
    ).resolves.toEqual({ amount: 42n });
    await expect(
      consumeMarkeeChallenge({ namespace, nonce: "1" }),
    ).resolves.toBeNull();
  });

  it("rejects an expired in-memory challenge", async () => {
    vi.useFakeTimers();
    await saveMarkeeChallenge({
      namespace,
      nonce: "2",
      ttlSeconds: 300,
      value: { challenge: true },
    });
    vi.advanceTimersByTime(301_000);

    await expect(
      consumeMarkeeChallenge({ namespace, nonce: "2" }),
    ).resolves.toBeNull();
  });

  it("uses Redis SET NX with expiry and atomic consume in durable mode", async () => {
    vi.stubEnv("MARKEE_AUTH_REDIS_REST_URL", "https://redis.example.test");
    vi.stubEnv("MARKEE_AUTH_REDIS_REST_TOKEN", "test-token");
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ result: "OK" }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            result: '{"amount":{"__gardensMarkeeBigInt":"42"},"valid":true}',
          }),
          { status: 200 },
        ),
      );

    await saveMarkeeChallenge({
      namespace,
      nonce: "3",
      ttlSeconds: 300,
      value: { amount: 42n, valid: true },
    });
    await expect(
      consumeMarkeeChallenge<{ amount: bigint; valid: boolean }>({
        namespace,
        nonce: "3",
      }),
    ).resolves.toEqual({ amount: 42n, valid: true });

    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual([
      "SET",
      "gardens:markee:authorization:test:3",
      '{"amount":{"__gardensMarkeeBigInt":"42"},"valid":true}',
      "EX",
      300,
      "NX",
    ]);
    expect(JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body))).toEqual([
      "EVAL",
      expect.stringContaining("redis.call('DEL', KEYS[1])"),
      1,
      "gardens:markee:authorization:test:3",
    ]);
  });

  it("allows only one Redis consumer to receive a challenge", async () => {
    vi.stubEnv("MARKEE_AUTH_REDIS_REST_URL", "https://redis.example.test");
    vi.stubEnv("MARKEE_AUTH_REDIS_REST_TOKEN", "test-token");
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ result: '{"valid":true}' }), {
          status: 200,
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ result: null }), { status: 200 }),
      );

    const results = await Promise.all([
      consumeMarkeeChallenge<{ valid: boolean }>({ namespace, nonce: "5" }),
      consumeMarkeeChallenge<{ valid: boolean }>({ namespace, nonce: "5" }),
    ]);

    expect(results).toContainEqual({ valid: true });
    expect(results).toContain(null);
  });

  it("atomically enforces Redis issue limits before provider work", async () => {
    vi.stubEnv("MARKEE_AUTH_REDIS_REST_URL", "https://redis.example.test");
    vi.stubEnv("MARKEE_AUTH_REDIS_REST_TOKEN", "test-token");
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ result: 1 }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ result: 0 }), { status: 200 }),
      );

    await expect(
      reserveMarkeeChallengeIssue({ namespace, subject: "1:0xcommunity" }),
    ).resolves.toBeUndefined();
    await expect(
      reserveMarkeeChallengeIssue({ namespace, subject: "1:0xcommunity" }),
    ).rejects.toBeInstanceOf(MarkeeChallengeRateLimitError);

    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual([
      "EVAL",
      expect.stringContaining("redis.call('INCR', KEYS[1])"),
      2,
      "gardens:markee:authorization:rate:{test}:global",
      "gardens:markee:authorization:rate:{test}:1:0xcommunity",
      60,
      120,
      12,
    ]);
  });

  it("limits repeated in-memory issues for one community", async () => {
    for (let index = 0; index < 12; index += 1) {
      await reserveMarkeeChallengeIssue({
        namespace,
        subject: "1:0xcommunity",
      });
    }

    await expect(
      reserveMarkeeChallengeIssue({ namespace, subject: "1:0xcommunity" }),
    ).rejects.toBeInstanceOf(MarkeeChallengeRateLimitError);
  });

  it("fails closed in production when durable storage is not configured", async () => {
    vi.stubEnv("NODE_ENV", "production");

    await expect(
      saveMarkeeChallenge({
        namespace,
        nonce: "4",
        ttlSeconds: 300,
        value: { challenge: true },
      }),
    ).rejects.toBeInstanceOf(MarkeeChallengeStoreUnavailableError);
  });
});
