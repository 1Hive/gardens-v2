import { describe, expect, it } from "vitest";

import { PoolHeaderToken, resolvePoolHeaderTokens } from "./poolHeaderTokens";

const RWAGMI: PoolHeaderToken = {
  address: "0xb200000000000000000000bf0548ab2ebd00ba5e",
  symbol: "RWAGMI",
  decimals: 18,
};

const GOV: PoolHeaderToken = {
  address: "0x1111111111111111111111111111111111111111",
  symbol: "GOV",
  decimals: 18,
};

const USDC: PoolHeaderToken = {
  address: "0x2222222222222222222222222222222222222222",
  symbol: "USDC",
  decimals: 6,
};

describe("resolvePoolHeaderTokens", () => {
  it("uses the governance token for capped signaling pools", () => {
    const { configToken, votingToken } = resolvePoolHeaderTokens({
      poolType: "signaling",
      governanceToken: RWAGMI,
      poolToken: undefined,
    });

    expect(configToken).toBe(RWAGMI);
    expect(votingToken).toBe(RWAGMI);
  });

  it("keeps the funding token separate from the voting token", () => {
    const { configToken, votingToken } = resolvePoolHeaderTokens({
      poolType: "funding",
      governanceToken: GOV,
      poolToken: USDC,
    });

    expect(configToken).toBe(USDC);
    expect(configToken?.decimals).toBe(6);
    expect(votingToken).toBe(GOV);
    expect(votingToken.decimals).toBe(18);
  });

  it("shows the stream token for streaming pools", () => {
    const { configToken, votingToken } = resolvePoolHeaderTokens({
      poolType: "streaming",
      governanceToken: GOV,
      poolToken: USDC,
    });

    expect(configToken).toBe(USDC);
    expect(votingToken).toBe(GOV);
  });

  it("never depends on poolToken for signaling pools", () => {
    const { configToken } = resolvePoolHeaderTokens({
      poolType: "signaling",
      governanceToken: RWAGMI,
      poolToken: undefined,
    });

    // The RWAGMI regression: an undefined config token renders as a permanent
    // loading spinner in `EthAddress`.
    expect(configToken).toBeDefined();
    expect(configToken?.address).toBe(RWAGMI.address);
    expect(configToken?.symbol).toBe("RWAGMI");
  });
});
