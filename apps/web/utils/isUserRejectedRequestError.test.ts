import { describe, expect, it } from "vitest";
import { isUserRejectedRequestError } from "./isUserRejectedRequestError";

describe("isUserRejectedRequestError", () => {
  it("recognizes a nested viem user rejection", () => {
    expect(
      isUserRejectedRequestError({
        name: "ContractFunctionExecutionError",
        cause: {
          name: "UserRejectedRequestError",
        },
      }),
    ).toBe(true);
  });

  it("recognizes a raw EIP-1193 rejection", () => {
    expect(isUserRejectedRequestError({ code: 4001 })).toBe(true);
  });

  it("does not classify contract reverts as user rejections", () => {
    expect(
      isUserRejectedRequestError({
        name: "ContractFunctionRevertedError",
        cause: { name: "AbiErrorSignatureNotFoundError" },
      }),
    ).toBe(false);
  });
});
