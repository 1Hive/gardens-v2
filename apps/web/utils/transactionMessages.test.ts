import { describe, expect, it } from "vitest";
import { isUserRejectedTransactionError } from "./transactionMessages";

describe("isUserRejectedTransactionError", () => {
  it("recognizes a nested EIP-1193 wallet rejection", () => {
    expect(
      isUserRejectedTransactionError({
        cause: { cause: { code: 4001 } },
      }),
    ).toBe(true);
  });

  it("recognizes the ACTION_REJECTED wallet code", () => {
    expect(isUserRejectedTransactionError({ code: "ACTION_REJECTED" })).toBe(
      true,
    );
  });

  it("does not classify a contract revert as a wallet rejection", () => {
    expect(
      isUserRejectedTransactionError(
        new Error("The stream transaction reverted."),
      ),
    ).toBe(false);
  });

  it("handles cyclic cause chains", () => {
    const error: { cause?: unknown } = {};
    error.cause = error;

    expect(isUserRejectedTransactionError(error)).toBe(false);
  });
});
