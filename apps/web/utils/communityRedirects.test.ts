import { describe, expect, it } from "vitest";

import {
  getCommunityRedirectPath,
  parseCommunityAddressRedirects,
} from "./communityRedirects";

const FROM = "0x1111111111111111111111111111111111111111";
const TO = "0x2222222222222222222222222222222222222222";
const OTHER = "0x3333333333333333333333333333333333333333";
const SOURCE_CHAIN = "8453";
const TARGET_CHAIN = "100";

describe("community redirects", () => {
  it("parses comma-separated chain and address redirect pairs", () => {
    const redirects = parseCommunityAddressRedirects(
      `${SOURCE_CHAIN}/${FROM}:${TARGET_CHAIN}/${TO}`,
    );

    expect(redirects.get(`${SOURCE_CHAIN}/${FROM}`)).toEqual({
      chain: TARGET_CHAIN,
      community: TO,
    });
  });

  it("matches source community addresses case-insensitively within the source chain", () => {
    const redirectPath = getCommunityRedirectPath(
      SOURCE_CHAIN,
      FROM.toUpperCase(),
      undefined,
      `${SOURCE_CHAIN}/${FROM.toUpperCase()}:${TARGET_CHAIN}/${TO.toUpperCase()}`,
    );

    expect(redirectPath).toBe(`/gardens/${TARGET_CHAIN}/${TO}`);
  });

  it("preserves query params when redirecting to the target community root", () => {
    const redirectPath = getCommunityRedirectPath(
      SOURCE_CHAIN,
      FROM,
      {
        filter: "active",
        tag: ["one", "two"],
      },
      `${SOURCE_CHAIN}/${FROM}:${TARGET_CHAIN}/${TO}`,
    );

    expect(redirectPath).toBe(
      `/gardens/${TARGET_CHAIN}/${TO}?filter=active&tag=one&tag=two`,
    );
  });

  it("does not redirect communities missing from the chain-specific mapping", () => {
    expect(
      getCommunityRedirectPath(
        SOURCE_CHAIN,
        OTHER,
        undefined,
        `${SOURCE_CHAIN}/${FROM}:${TARGET_CHAIN}/${TO}`,
      ),
    ).toBeNull();
    expect(
      getCommunityRedirectPath(
        TARGET_CHAIN,
        FROM,
        undefined,
        `${SOURCE_CHAIN}/${FROM}:${TARGET_CHAIN}/${TO}`,
      ),
    ).toBeNull();
  });

  it("ignores malformed, invalid, and self-redirect entries", () => {
    const redirects = parseCommunityAddressRedirects(
      [
        "bad-entry",
        `${FROM}:${TARGET_CHAIN}/${TO}`,
        `chain/${FROM}:${TARGET_CHAIN}/${TO}`,
        `${SOURCE_CHAIN}/${FROM}:not-an-address`,
        `${SOURCE_CHAIN}/${FROM}:${SOURCE_CHAIN}/${FROM}`,
        `${SOURCE_CHAIN}/${FROM}:${TARGET_CHAIN}/${TO}:extra`,
        `${SOURCE_CHAIN}/${OTHER}:${TARGET_CHAIN}/${TO}`,
      ].join(","),
    );

    expect([...redirects.entries()]).toEqual([
      [`${SOURCE_CHAIN}/${OTHER}`, { chain: TARGET_CHAIN, community: TO }],
    ]);
  });
});
