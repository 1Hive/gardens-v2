import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  verifyConnectedUrl: vi.fn(),
  recoverMessageAddress: vi.fn(),
  getBytecode: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@citizenwallet/sdk", () => ({
  CommunityConfig: class CommunityConfig {},
  generateConnectionMessage: vi.fn(() => `0x${"22".repeat(32)}`),
  getAccountAddress: vi.fn(),
  verifyConnectedUrl: mocks.verifyConnectedUrl,
}));
vi.mock("viem", async (importOriginal) => ({
  ...(await importOriginal<typeof import("viem")>()),
  recoverMessageAddress: mocks.recoverMessageAddress,
}));
vi.mock("./publicClient", () => ({
  getEnvPublicClient: () => ({ getBytecode: mocks.getBytecode }),
}));

import {
  getCitizenConnectionParams,
  hasCitizenConnectionParams,
  verifyCitizenConnection,
} from "./citizenWalletServer";

const account = "0x5C6F30Ee81BC873cfE608E2D1b889f5eeA46db03";
const validParams = {
  sigAuthAccount: account,
  sigAuthExpiry: "2099-08-16T19:00:28.689Z",
  sigAuthSignature: `0x${"11".repeat(65)}`,
  sigAuthRedirect: "https://app.citizenwallet.xyz/?alias=bread",
};

describe("Citizen Wallet server verification", () => {
  beforeEach(() => {
    mocks.verifyConnectedUrl.mockReset();
    mocks.recoverMessageAddress.mockReset();
    mocks.getBytecode.mockReset();
    mocks.recoverMessageAddress.mockResolvedValue(
      "0x1111111111111111111111111111111111111111",
    );
    mocks.getBytecode.mockResolvedValue("0x1234");
  });

  it("requires the complete signed connection envelope", () => {
    expect(hasCitizenConnectionParams(validParams)).toBe(true);
    expect(
      hasCitizenConnectionParams({
        ...validParams,
        sigAuthSignature: undefined,
      }),
    ).toBe(false);
    expect(getCitizenConnectionParams(validParams)).toEqual(validParams);
    expect(
      getCitizenConnectionParams({
        ...validParams,
        sigAuthSignature: undefined,
      }),
    ).toBeNull();
  });

  it("returns the verified Citizen account and redirect", async () => {
    mocks.verifyConnectedUrl.mockResolvedValue(account.toLowerCase());

    await expect(verifyCitizenConnection(validParams)).resolves.toEqual({
      account,
      redirectUrl: validParams.sigAuthRedirect,
    });
    const passedParams = mocks.verifyConnectedUrl.mock.calls[0][1]
      .params as URLSearchParams;
    expect(passedParams.get("sigAuthAccount")).toBe(account);
    expect(passedParams.get("sigAuthRedirect")).toBe(
      validParams.sigAuthRedirect,
    );
  });

  it("rejects an untrusted redirect before signature verification", async () => {
    await expect(
      verifyCitizenConnection({
        ...validParams,
        sigAuthRedirect: "https://app.citizenwallet.xyz.attacker.test",
      }),
    ).resolves.toBeNull();
    expect(mocks.verifyConnectedUrl).not.toHaveBeenCalled();
  });

  it("rejects invalid and expired SDK verification results", async () => {
    mocks.verifyConnectedUrl.mockResolvedValueOnce(null);
    await expect(verifyCitizenConnection(validParams)).resolves.toBeNull();

    mocks.verifyConnectedUrl.mockRejectedValueOnce(new Error("expired"));
    await expect(verifyCitizenConnection(validParams)).resolves.toBeNull();
  });

  it("rejects an EOA even when the SDK accepts its signature", async () => {
    mocks.verifyConnectedUrl.mockResolvedValue(account);
    mocks.recoverMessageAddress.mockResolvedValue(account);

    await expect(verifyCitizenConnection(validParams)).resolves.toBeNull();
    expect(mocks.getBytecode).not.toHaveBeenCalled();
  });
});
