import { describe, expect, it, vi } from "vitest";
import {
  getCovenantSignatureErrorAction,
  isUserRejectedWalletRequest,
  resolveSigningProvider,
  signMessageWithProvider,
} from "./signMessageWithProvider";

const account = "0x0000000000000000000000000000000000000001" as const;
const signature = `0x${"12".repeat(65)}` as const;

describe("signMessageWithProvider", () => {
  it("sends a hex-encoded personal_sign request in message-address order", async () => {
    const request = vi.fn().mockResolvedValue(signature);

    await expect(
      signMessageWithProvider({
        connector: { getProvider: async () => ({ request }) },
        account,
        message: "Gardens signature test",
      }),
    ).resolves.toBe(signature);

    expect(request).toHaveBeenCalledWith({
      method: "personal_sign",
      params: ["0x47617264656e73207369676e61747572652074657374", account],
    });
  });

  it("uses the selected provider exposed by a multi-wallet injector", async () => {
    const aggregateRequest = vi.fn();
    const selectedRequest = vi.fn().mockResolvedValue(signature);

    await signMessageWithProvider({
      connector: {
        getProvider: async () => ({
          request: aggregateRequest,
          selectedProvider: { request: selectedRequest },
        }),
      },
      account,
      message: "Covenant",
    });

    expect(selectedRequest).toHaveBeenCalledOnce();
    expect(aggregateRequest).not.toHaveBeenCalled();
  });

  it("rejects stale connector providers without request()", () => {
    expect(() => resolveSigningProvider({})).toThrow(
      "does not expose a valid request() method",
    );
  });

  it.each([
    { code: 4001 },
    { code: "ACTION_REJECTED" },
    { name: "UserRejectedRequestError" },
    { message: "User denied message signature" },
    { cause: { code: 4001 } },
  ])("recognizes wallet rejection errors %#", (error) => {
    expect(isUserRejectedWalletRequest(error)).toBe(true);
  });

  it.each([
    new Error("Missing or invalid request() method: personal_sign"),
    new Error("The connected wallet does not support message signing"),
    { cause: new Error("WalletConnect session expired") },
  ])(
    "does not classify non-rejection signing failures as rejection",
    (error) => {
      expect(isUserRejectedWalletRequest(error)).toBe(false);
    },
  );

  it("handles circular error causes", () => {
    const error: { cause?: unknown } = {};
    error.cause = error;

    expect(isUserRejectedWalletRequest(error)).toBe(false);
  });

  it("blocks wallet rejection but skips other covenant signing failures", () => {
    expect(getCovenantSignatureErrorAction({ cause: { code: 4001 } })).toBe(
      "block",
    );
    expect(
      getCovenantSignatureErrorAction(
        new Error("Missing or invalid request() method: personal_sign"),
      ),
    ).toBe("skip");
  });
});
