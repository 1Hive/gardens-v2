import { describe, expect, it } from "vitest";
import {
  getAllowanceAction,
  getAllowanceWalletTransactionCount,
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
