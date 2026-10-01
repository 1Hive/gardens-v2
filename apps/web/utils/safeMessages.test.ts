import { hashTypedData } from "viem";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/configs/chains", () => ({
  chainConfigMap: { 100: { safePrefix: "gno" } },
}));

import { getSafeMessageHash } from "./safeMessages";

describe("getSafeMessageHash", () => {
  it("matches the hash the Safe Transaction Service assigns", () => {
    // A Markee opt-in proposed from the 1Hive council Safe on Gnosis Chain.
    const messageHash = hashTypedData({
      domain: {
        chainId: 100,
        name: "Gardens Markee",
        verifyingContract: "0xE2396fe2169ca026962971d3B2E373Ba925B6257",
        version: "1",
      },
      message: {
        communityChainId: 100n,
        communityKey:
          "0x5403681a841cfacede88e7c0c2cb240aaf8b7d858221b7faab93d9e1acf43bf4",
        deadline: 1790895104n,
        leaderboardFactory: "0x37f420fdE5c98e611EB7cb9b74ef579D84697039",
        leaderboardMetadataHash:
          "0xc008f4c8e549ac28ad733f908b3b2020159db231b4d24d89fd735c14ab758bd9",
        nonce:
          499030858062867458530454777850849044234712960402349872505525023695867393792n,
        registryCommunity: "0xE2396fe2169ca026962971d3B2E373Ba925B6257",
      },
      primaryType: "OptInAuthorization",
      types: {
        OptInAuthorization: [
          { name: "communityKey", type: "bytes32" },
          { name: "communityChainId", type: "uint256" },
          { name: "registryCommunity", type: "address" },
          { name: "leaderboardFactory", type: "address" },
          { name: "leaderboardMetadataHash", type: "bytes32" },
          { name: "nonce", type: "uint256" },
          { name: "deadline", type: "uint256" },
        ],
      },
    });

    expect(
      getSafeMessageHash({
        chainId: 100,
        messageHash,
        safe: "0xc6c2E9EFB898A42DB4137B07b727b45e0C353d81",
      }),
    ).toBe(
      "0x5eb3223d624e5f458695805359ef9f3f35fcea16613d47411cac8405ce708109",
    );
  });
});
