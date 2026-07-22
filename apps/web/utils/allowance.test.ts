import { describe, expect, it } from "vitest";
import {
  getAllowanceAction,
  getAllowanceShortfall,
  getAllowanceWalletTransactionCount,
  preflightIncreaseAllowance,
} from "./allowance";

describe("getAllowanceAction", () => {
  it("skips approval when the existing allowance covers the raw portion", () => {
    const action = getAllowanceAction({
      currentAllowance: 8_061n,
      requiredAllowance: 8_061n,
    });

    expect(action).toBe("none");
    expect(getAllowanceWalletTransactionCount(action)).toBe(1);
  });

  it("approves once when stream funding replaces an insufficient allowance", () => {
    const action = getAllowanceAction({
      currentAllowance: 5_257_002401066812951924n,
      requiredAllowance: 8_061_472557078988967696n,
      resetAllowanceIfNeeded: false,
    });

    expect(action).toBe("approve");
    expect(getAllowanceWalletTransactionCount(action)).toBe(2);
  });

  it("increases only the shortfall when the token supports it", () => {
    const currentAllowance = 5_257_002401066812951924n;
    const requiredAllowance = 8_061_472557078988967696n;
    const action = getAllowanceAction({
      currentAllowance,
      requiredAllowance,
      increaseAllowanceSupported: true,
    });

    expect(action).toBe("increase");
    expect(getAllowanceShortfall(currentAllowance, requiredAllowance)).toBe(
      2_804_470156012176015772n,
    );
    expect(getAllowanceWalletTransactionCount(action)).toBe(2);
  });

  it("approves once from a zero allowance", () => {
    const action = getAllowanceAction({
      currentAllowance: 0n,
      requiredAllowance: 100n,
    });

    expect(action).toBe("approve");
    expect(getAllowanceWalletTransactionCount(action)).toBe(2);
  });

  it("preserves zero-first approval as the shared-hook default", () => {
    const action = getAllowanceAction({
      currentAllowance: 50n,
      requiredAllowance: 100n,
    });

    expect(action).toBe("reset-and-approve");
    expect(getAllowanceWalletTransactionCount(action)).toBe(3);
  });
});

describe("preflightIncreaseAllowance", () => {
  it("uses increaseAllowance when its simulation returns true", async () => {
    await expect(
      preflightIncreaseAllowance(async () => ({ result: true })),
    ).resolves.toBe(true);
  });

  it("falls back when simulation returns false", async () => {
    await expect(
      preflightIncreaseAllowance(async () => ({ result: false })),
    ).resolves.toBe(false);
  });

  it("falls back when the token does not implement increaseAllowance", async () => {
    await expect(
      preflightIncreaseAllowance(async () => {
        throw new Error("function selector was not recognized");
      }),
    ).resolves.toBe(false);
  });
});
