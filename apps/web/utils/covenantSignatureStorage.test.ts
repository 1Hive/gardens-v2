import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  COVENANT_SIGNATURES_STORAGE_KEY,
  getCovenantSignature,
  getCovenantSignatureKey,
  setCovenantSignature,
} from "./covenantSignatureStorage";

const values = new Map<string, string>();
const localStorage = {
  getItem: (key: string) => values.get(key) ?? null,
  setItem: (key: string, value: string) => values.set(key, value),
};

describe("covenantSignatureStorage", () => {
  beforeEach(() => {
    values.clear();
    vi.stubGlobal("window", { localStorage });
  });

  it("builds a chain-community-covenant key with a normalized address", () => {
    expect(
      getCovenantSignatureKey({
        chainId: 100,
        communityAddress: "0xE33E18B5887CF16AD4E351E98980EB5F50727C31",
        covenant: "ipfs-hash",
      }),
    ).toBe("100-0xe33e18b5887cf16ad4e351e98980eb5f50727c31-ipfs-hash");
  });

  it("stores signatures for multiple communities in one object", () => {
    setCovenantSignature("first", "0x1234");
    setCovenantSignature("second", "0xabcd");

    expect(
      JSON.parse(values.get(COVENANT_SIGNATURES_STORAGE_KEY) ?? "{}"),
    ).toEqual({
      first: "0x1234",
      second: "0xabcd",
    });
  });

  it.each(["", "0x00"] as const)(
    "treats a manually stored %j value as an explicit bypass",
    (signature) => {
      values.set(
        COVENANT_SIGNATURES_STORAGE_KEY,
        JSON.stringify({ covenant: signature }),
      );

      expect(getCovenantSignature("covenant")).toEqual({
        found: true,
        signature,
      });
    },
  );
});
