import { describe, expect, it, vi } from "vitest";
import {
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
      params: [
        "0x47617264656e73207369676e61747572652074657374",
        account,
      ],
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
});
