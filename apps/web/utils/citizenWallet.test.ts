import { Address, decodeFunctionData, getAddress, parseAbi } from "viem";
import { describe, expect, it } from "vitest";
import {
  BREAD_TOKEN_ADDRESS,
  BREAD_COMMUNITY_ADDRESS,
  buildCitizenCalldataUrl,
  buildCitizenConnectedUrl,
  buildCitizenRegistrationPath,
  CITIZEN_COVENANT_BYPASS,
  encodeCitizenApproval,
  encodeCitizenRegistration,
  getCitizenRegistrationAction,
  getBreadCitizenCommunityFromPath,
  isCitizenWalletConnectConnector,
  isAllowedCitizenRedirect,
  isBreadCitizenRegistration,
} from "./citizenWallet";

const community = getAddress("0xe33e18b5887cf16ad4e351e98980eb5f50727c31");

describe("Citizen Wallet registration eligibility", () => {
  it("enables only the BREAD token on Gnosis", () => {
    expect(
      isBreadCitizenRegistration({
        chainId: 100,
        tokenAddress: BREAD_TOKEN_ADDRESS.toLowerCase(),
      }),
    ).toBe(true);
    expect(
      isBreadCitizenRegistration({
        chainId: 10,
        tokenAddress: BREAD_TOKEN_ADDRESS,
      }),
    ).toBe(false);
    expect(
      isBreadCitizenRegistration({ chainId: 100, tokenAddress: "invalid" }),
    ).toBe(false);
  });

  it("builds the dedicated Citizen registration path", () => {
    expect(buildCitizenRegistrationPath(community)).toBe(
      `/gardens/100/${community}/citizen`,
    );
  });

  it("recognizes the BREAD community and its nested routes", () => {
    expect(
      getBreadCitizenCommunityFromPath(
        `/gardens/100/${BREAD_COMMUNITY_ADDRESS}`,
      ),
    ).toBe(BREAD_COMMUNITY_ADDRESS);
    expect(
      getBreadCitizenCommunityFromPath(
        `/gardens/100/${BREAD_COMMUNITY_ADDRESS}/pool/1`,
      ),
    ).toBe(BREAD_COMMUNITY_ADDRESS);
    expect(
      getBreadCitizenCommunityFromPath(
        "/gardens/100/0x1111111111111111111111111111111111111111",
      ),
    ).toBeNull();
    expect(
      getBreadCitizenCommunityFromPath(
        `/gardens/10/${BREAD_COMMUNITY_ADDRESS}`,
      ),
    ).toBeNull();
  });

  it("recognizes both WalletConnect connector ids used by Citizen web wallet", () => {
    expect(isCitizenWalletConnectConnector("walletConnect")).toBe(true);
    expect(isCitizenWalletConnectConnector("walletConnectLegacy")).toBe(true);
    expect(isCitizenWalletConnectConnector("injected")).toBe(false);
    expect(isCitizenWalletConnectConnector(undefined)).toBe(false);
  });
});

describe("Citizen Wallet signed redirect boundary", () => {
  it("rebuilds a callback URL from the signed envelope after canonicalization", () => {
    const connectionParams = {
      sigAuthAccount: community,
      sigAuthExpiry: "2099-08-16T19:00:28.689Z",
      sigAuthSignature: `0x${"11".repeat(65)}`,
      sigAuthRedirect: "https://app.citizenwallet.xyz",
    };
    const url = buildCitizenConnectedUrl(
      "https://preview.gardens.fund/gardens/100/community/citizen?discarded=true",
      connectionParams,
    );

    expect(url.pathname).toBe("/gardens/100/community/citizen");
    expect(url.searchParams.get("discarded")).toBeNull();
    expect(Object.fromEntries(url.searchParams)).toEqual(connectionParams);
  });

  it("accepts only the HTTPS Citizen Wallet application origin", () => {
    expect(
      isAllowedCitizenRedirect("https://app.citizenwallet.xyz/?alias=bread"),
    ).toBe(true);
    expect(isAllowedCitizenRedirect("http://app.citizenwallet.xyz")).toBe(
      false,
    );
    expect(
      isAllowedCitizenRedirect("https://app.citizenwallet.xyz.evil.test"),
    ).toBe(false);
    expect(isAllowedCitizenRedirect("https://citizenwallet.xyz")).toBe(false);
  });

  it("creates an interceptable calldata URL with an encoded success callback", () => {
    const calldata = "0x1234";
    const successUrl =
      "http://localhost:3000/gardens/100/community/citizen?sigAuthAccount=0xabc&citizenAction=registration-submitted";
    const result = new URL(
      buildCitizenCalldataUrl({
        redirectUrl: "https://app.citizenwallet.xyz/?alias=bread",
        target: community,
        calldata,
        successUrl,
      }),
    );

    expect(result.origin).toBe("https://app.citizenwallet.xyz");
    expect(result.searchParams.get("alias")).toBe("bread");
    expect(result.searchParams.get("address")).toBe(community);
    expect(result.searchParams.get("value")).toBe("0");
    expect(result.searchParams.get("calldata")).toBe(calldata);
    expect(result.searchParams.get("success")).toBe(successUrl);
  });

  it("refuses to create a request for an attacker-controlled redirect", () => {
    expect(() =>
      buildCitizenCalldataUrl({
        redirectUrl: "https://app.citizenwallet.xyz.attacker.test",
        target: community,
        calldata: "0x1234",
        successUrl: "https://app.gardens.fund/success",
      }),
    ).toThrow("Untrusted Citizen Wallet redirect URL");
  });
});

describe("Citizen Wallet transaction sequence", () => {
  it("requires approval before registration when allowance is insufficient", () => {
    expect(
      getCitizenRegistrationAction({
        isMember: false,
        balance: 20n,
        allowance: 0n,
        registrationCost: 10n,
      }),
    ).toBe("approve");
    expect(
      getCitizenRegistrationAction({
        isMember: false,
        balance: 20n,
        allowance: 10n,
        registrationCost: 10n,
      }),
    ).toBe("register");
  });

  it("stops for insufficient balance and completed membership", () => {
    expect(
      getCitizenRegistrationAction({
        isMember: false,
        balance: 9n,
        allowance: 100n,
        registrationCost: 10n,
      }),
    ).toBe("insufficient-balance");
    expect(
      getCitizenRegistrationAction({
        isMember: true,
        balance: 0n,
        allowance: 0n,
        registrationCost: 10n,
      }),
    ).toBe("already-registered");
  });

  it("encodes the exact BREAD approval", () => {
    const amount = 10_000000000000000000n;
    const data = encodeCitizenApproval({
      communityAddress: community as Address,
      amount,
    });
    const decoded = decodeFunctionData({
      abi: parseAbi([
        "function approve(address spender, uint256 amount) returns (bool)",
      ]),
      data,
    });

    expect(decoded.functionName).toBe("approve");
    expect(decoded.args).toEqual([community, amount]);
  });

  it("bypasses the covenant only in the Citizen registration calldata", () => {
    const data = encodeCitizenRegistration();
    const decoded = decodeFunctionData({
      abi: parseAbi(["function stakeAndRegisterMember(string covenantSig)"]),
      data,
    });

    expect(decoded.functionName).toBe("stakeAndRegisterMember");
    expect(decoded.args).toEqual([CITIZEN_COVENANT_BYPASS]);
    expect(data.slice(0, 10)).toBe("0x9a1f46e2");
  });
});
