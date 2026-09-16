import { describe, expect, it, vi } from "vitest";
import { signTypedDataWithProvider } from "./signTypedDataWithProvider";

const account = "0x0000000000000000000000000000000000000001" as const;
const signature = `0x${"12".repeat(65)}` as const;

const typedData = {
  domain: {
    chainId: 100,
    name: "Gardens Markee",
    verifyingContract: "0x0000000000000000000000000000000000000002",
    version: "1",
  },
  message: {
    communityChainId: "100",
    registryCommunity: "0x0000000000000000000000000000000000000002",
  },
  primaryType: "OptInAuthorization",
  types: {
    OptInAuthorization: [
      { name: "communityChainId", type: "uint256" },
      { name: "registryCommunity", type: "address" },
    ],
  },
} as const;

describe("signTypedDataWithProvider", () => {
  it("asks the connector-selected provider for an EIP-712 signature", async () => {
    const aggregateRequest = vi.fn();
    const selectedRequest = vi.fn().mockResolvedValue(signature);

    await expect(
      signTypedDataWithProvider({
        account,
        connector: {
          getProvider: async () => ({
            request: aggregateRequest,
            selectedProvider: { request: selectedRequest },
          }),
        },
        typedData,
      }),
    ).resolves.toBe(signature);

    expect(aggregateRequest).not.toHaveBeenCalled();
    expect(selectedRequest).toHaveBeenCalledOnce();
    const request = selectedRequest.mock.calls[0]?.[0];
    expect(request).toMatchObject({
      method: "eth_signTypedData_v4",
      params: [account, expect.any(String)],
    });

    const payload = JSON.parse(request.params[1]);
    expect(payload).toMatchObject(typedData);
    expect(payload.types.EIP712Domain).toEqual([
      { name: "name", type: "string" },
      { name: "version", type: "string" },
      { name: "chainId", type: "uint256" },
      { name: "verifyingContract", type: "address" },
    ]);
  });

  it("rejects a malformed signature response", async () => {
    await expect(
      signTypedDataWithProvider({
        account,
        connector: {
          getProvider: async () => ({
            request: vi.fn().mockResolvedValue("not-a-signature"),
          }),
        },
        typedData,
      }),
    ).rejects.toThrow("returned an invalid signature");
  });
});
