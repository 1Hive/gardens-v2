import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getUnknownErrorSelector,
  lookupErrorSignature,
} from "./errorSignatures";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("getUnknownErrorSelector", () => {
  it("extracts a selector only from an ABI signature-not-found error", () => {
    expect(
      getUnknownErrorSelector({
        name: "ContractFunctionExecutionError",
        cause: {
          name: "ContractFunctionRevertedError",
          cause: {
            name: "AbiErrorSignatureNotFoundError",
            signature: "0x7F66BE17",
          },
        },
      }),
    ).toBe("0x7f66be17");
  });

  it("does not look up selectors from errors already decoded by the ABI", () => {
    expect(
      getUnknownErrorSelector({
        name: "ContractFunctionRevertedError",
        signature: "0x7f66be17",
        data: { errorName: "SUPER_GOODDOLLAR_PAUSED" },
      }),
    ).toBeUndefined();
  });
});

describe("lookupErrorSignature", () => {
  it("returns the candidates associated with the unknown selector", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        result: {
          function: {
            "0x12345678": [
              {
                name: "ExampleError(uint256)",
                filtered: false,
                hasVerifiedContract: true,
              },
            ],
          },
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(lookupErrorSignature("0x12345678")).resolves.toEqual({
      provider: "sourcify-4byte",
      selector: "0x12345678",
      candidates: [
        {
          name: "ExampleError(uint256)",
          filtered: false,
          hasVerifiedContract: true,
        },
      ],
    });
    expect(fetchMock).toHaveBeenCalledOnce();
  });
});
