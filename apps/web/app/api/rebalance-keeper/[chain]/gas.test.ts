import { afterEach, describe, expect, it } from "vitest";
import {
  applyRebalanceGasBuffer,
  getRebalanceBlockGasCapBps,
  getRebalanceGasBufferBps,
} from "./gas";

describe("rebalance keeper gas buffer", () => {
  const originalGasBufferBps = process.env.STREAMING_REBALANCE_GAS_BUFFER_BPS;
  const originalBlockGasCapBps =
    process.env.STREAMING_REBALANCE_BLOCK_GAS_CAP_BPS;

  afterEach(() => {
    process.env.STREAMING_REBALANCE_GAS_BUFFER_BPS = originalGasBufferBps;
    process.env.STREAMING_REBALANCE_BLOCK_GAS_CAP_BPS =
      originalBlockGasCapBps;
  });

  it("adds the default gas buffer to the estimated rebalance gas", () => {
    expect(
      applyRebalanceGasBuffer({
        estimatedGas: 7_980_419n,
        blockGasLimit: 30_000_000n,
      }),
    ).toBe(11_172_587n);
  });

  it("rounds buffered gas up", () => {
    expect(
      applyRebalanceGasBuffer({
        estimatedGas: 1n,
        bufferBps: 15_001n,
      }),
    ).toBe(2n);
  });

  it("caps the buffered gas below the block gas limit", () => {
    expect(
      applyRebalanceGasBuffer({
        estimatedGas: 9_000_000n,
        blockGasLimit: 10_000_000n,
      }),
    ).toBe(9_000_000n);
  });

  it("reads valid gas buffer and block cap values from env", () => {
    process.env.STREAMING_REBALANCE_GAS_BUFFER_BPS = "12500";
    process.env.STREAMING_REBALANCE_BLOCK_GAS_CAP_BPS = "8000";

    expect(getRebalanceGasBufferBps()).toBe(12_500n);
    expect(getRebalanceBlockGasCapBps()).toBe(8_000n);
  });

  it("falls back when env values are invalid", () => {
    process.env.STREAMING_REBALANCE_GAS_BUFFER_BPS = "9999";
    process.env.STREAMING_REBALANCE_BLOCK_GAS_CAP_BPS = "10001";

    expect(getRebalanceGasBufferBps()).toBe(14_000n);
    expect(getRebalanceBlockGasCapBps()).toBe(9_000n);
  });
});
